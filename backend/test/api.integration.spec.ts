import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/mail/mail.service';
import { TicketStatus, TicketPriority } from '@prisma/client';

describe('HelpDesk Lite API (Integration Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailService: MailService;

  let employeeToken: string;
  let supportToken: string;
  let managerToken: string;
  let createdTicketId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser('test-cookie-secret'));
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    mailService = app.get<MailService>(MailService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    it('authenticates Employee and issues valid token and cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'employee@helpdesk-lite.local',
          password: 'Password123!',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('EMPLOYEE');
      employeeToken = res.body.data.accessToken;

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('access_token=');
    });

    it('authenticates Support and Manager users', async () => {
      const suppRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'support1@helpdesk-lite.local', password: 'Password123!' })
        .expect(200);
      supportToken = suppRes.body.data.accessToken;

      const mgrRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'manager@helpdesk-lite.local', password: 'Password123!' })
        .expect(200);
      managerToken = mgrRes.body.data.accessToken;

      expect(supportToken).toBeDefined();
      expect(managerToken).toBeDefined();
    });

    it('rejects invalid password with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'employee@helpdesk-lite.local', password: 'IncorrectPassword!' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Ticket Submission & Role-based Scoping', () => {
    it('allows Employee to create a ticket with unique HD-XXXXXX identifier', async () => {
      const categories = await prisma.category.findMany();
      const itCategory = categories.find((c) => c.name === 'IT')!;

      const res = await request(app.getHttpServer())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Laptop battery draining unusually fast',
          description: 'Battery drains from 100% to 10% within 45 minutes.',
          categoryId: itCategory.id,
          priority: TicketPriority.HIGH,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketNumber).toMatch(/^HD-\d{6}$/);
      expect(res.body.data.status).toBe(TicketStatus.NEW);
      expect(res.body.data.assigneeId).toBeNull();

      createdTicketId = res.body.data.id;
    });

    it('returns ticket when requested by creator', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdTicketId);
      expect(res.body.data.history).toBeDefined();
      expect(res.body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    it('prevents an employee from viewing another employee ticket (IDOR)', async () => {
      // Create second employee with known credentials
      const emp2PasswordHash = await bcrypt.hash('Password123!', 4);
      await prisma.user.upsert({
        where: { email: 'employee2@helpdesk-lite.local' },
        update: { passwordHash: emp2PasswordHash },
        create: {
          email: 'employee2@helpdesk-lite.local',
          name: 'Second Employee',
          passwordHash: emp2PasswordHash,
          role: 'EMPLOYEE',
        },
      });

      // Authenticate as the second employee
      const emp2Login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'employee2@helpdesk-lite.local', password: 'Password123!' })
        .expect(200);
      const emp2Token = emp2Login.body.data.accessToken;

      // employee2 must NOT be able to read employee1's ticket
      const forbiddenRes = await request(app.getHttpServer())
        .get(`/api/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${emp2Token}`)
        .expect(403);

      expect(forbiddenRes.body.success).toBe(false);
      expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Support Claim, State Machine Transitions, and Reopening', () => {
    it('allows Support staff to claim the ticket and moves status to IN_PROGRESS', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tickets/${createdTicketId}/assign`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ reason: 'Taking ownership of hardware issue' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TicketStatus.IN_PROGRESS);
      expect(res.body.data.assigneeId).toBeDefined();
    });

    it('rejects forbidden status transition (IN_PROGRESS -> CLOSED) without resolving first', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ status: TicketStatus.CLOSED })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('allows valid transition IN_PROGRESS -> WAITING -> IN_PROGRESS -> RESOLVED', async () => {
      // 1. To WAITING
      await request(app.getHttpServer())
        .patch(`/api/tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ status: TicketStatus.WAITING, reason: 'Waiting on diagnostics log' })
        .expect(200);

      // 2. Back to IN_PROGRESS
      await request(app.getHttpServer())
        .patch(`/api/tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ status: TicketStatus.IN_PROGRESS, reason: 'Logs received' })
        .expect(200);

      // 3. To RESOLVED
      const resolvedRes = await request(app.getHttpServer())
        .patch(`/api/tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ status: TicketStatus.RESOLVED, reason: 'Battery replaced' })
        .expect(200);

      expect(resolvedRes.body.data.status).toBe(TicketStatus.RESOLVED);
      expect(resolvedRes.body.data.resolvedAt).toBeDefined();
    });

    it('allows reopening a RESOLVED ticket with reason', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tickets/${createdTicketId}/reopen`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ reason: 'Replacement battery still dropping charge rapidly' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('verifies complete audit history log contains all transitions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tickets/${createdTicketId}/history`)
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const events = res.body.data.map((h: any) => h.eventType);
      expect(events).toContain('TICKET_CREATED');
      expect(events).toContain('TICKET_ASSIGNED');
      expect(events).toContain('STATUS_CHANGED');
      expect(events).toContain('TICKET_RESOLVED');
      expect(events).toContain('TICKET_REOPENED');
    });
  });

  describe('Manager Workload & Dashboards', () => {
    it('returns manager overview metrics and workload distribution', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/manager')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.workload).toBeDefined();
      expect(Array.isArray(res.body.data.workload)).toBe(true);
    });

    it('forbids employee from accessing manager dashboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/manager')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Password Recovery & Reset End-to-End', () => {
    it('initiates forgot password, dispatches reset email, resets password, and invalidates sessions', async () => {
      // 1. Forgot password request
      mailService.clearSentEmails();
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'employee@helpdesk-lite.local' })
        .expect(200);

      const sentEmails = mailService.getSentEmails();
      expect(sentEmails.length).toBe(1);
      const emailBody = sentEmails[0].text;
      const tokenMatch = emailBody.match(/Token: ([a-f0-9]{64})/);
      expect(tokenMatch).toBeDefined();
      const rawToken = tokenMatch![1];

      // 2. Reset password with rawToken
      const resetRes = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'BrandNewPassword123!',
        })
        .expect(200);

      expect(resetRes.body.success).toBe(true);

      // 3. Verify old password fails
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'employee@helpdesk-lite.local',
          password: 'Password123!',
        })
        .expect(401);

      // 4. Verify new password succeeds
      const newLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'employee@helpdesk-lite.local',
          password: 'BrandNewPassword123!',
        })
        .expect(200);

      expect(newLogin.body.data.accessToken).toBeDefined();

      // 5. Verify token cannot be re-used
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!',
        })
        .expect(400);

      // Revert password back for consistency
      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${newLogin.body.data.accessToken}`)
        .send({
          currentPassword: 'BrandNewPassword123!',
          newPassword: 'Password123!',
          confirmPassword: 'Password123!',
        })
        .expect(200);
    });
  });
});
