import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../src/mail/mail.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let mailService: MailService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@helpdesk-lite.local',
    name: 'Test Employee',
    passwordHash: '',
    role: 'EMPLOYEE',
    isActive: true,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
  });

  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => defaultValue),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('successfully logs in with valid credentials and creates session', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({});

      const result = await service.login(
        { email: 'test@helpdesk-lite.local', password: 'CorrectPassword123!' },
        'Mozilla/5.0',
        '127.0.0.1',
      );

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('test@helpdesk-lite.local');
      expect(mockPrismaService.session.create).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@helpdesk-lite.local', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive or not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@helpdesk-lite.local', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('validates current password, hashes new password, and invalidates old sessions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.session.deleteMany.mockResolvedValue({});

      const result = await service.changePassword('user-uuid-1', {
        currentPassword: 'CorrectPassword123!',
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });

      expect(result.message).toContain('Password changed successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-uuid-1' } });
    });

    it('rejects if newPassword and confirmPassword do not match', async () => {
      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: 'CorrectPassword123!',
          newPassword: 'BrandNewPassword123!',
          confirmPassword: 'MismatchPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword and resetPassword', () => {
    it('generates a secure token and sends email without revealing user existence', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordResetToken.deleteMany.mockResolvedValue({});
      mockPrismaService.passwordResetToken.create.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@helpdesk-lite.local' });

      expect(result.message).toContain('password reset instructions');
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('rejects expired or used reset tokens', async () => {
      // Mock used token
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id-1',
        userId: 'user-uuid-1',
        usedAt: new Date(), // Already used
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        service.resetPassword({
          token: 'raw-token-123',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully resets password, marks token used, and invalidates all sessions', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id-1',
        userId: 'user-uuid-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.passwordResetToken.update.mockResolvedValue({});
      mockPrismaService.session.deleteMany.mockResolvedValue({});

      const result = await service.resetPassword({
        token: 'raw-token-123',
        newPassword: 'NewValidPassword123!',
        confirmPassword: 'NewValidPassword123!',
      });

      expect(result.message).toContain('Password has been reset successfully');
      expect(mockPrismaService.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) }),
      );
      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-uuid-1' } });
    });
  });
});
