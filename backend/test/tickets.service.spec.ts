import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from '../src/tickets/tickets.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role, TicketPriority, TicketStatus, HistoryEventType } from '@prisma/client';
import { InvalidStatusTransitionError } from '@helpdesk/shared';

describe('TicketsService', () => {
  let service: TicketsService;

  const mockEmployee = { id: 'emp-1', role: Role.EMPLOYEE };
  const mockSupport = { id: 'supp-1', role: Role.SUPPORT };
  const mockManager = { id: 'mgr-1', role: Role.MANAGER };

  const mockPrisma: any = {
    category: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    ticketSequence: {
      create: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    ticketHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockNotifications = {
    notifyRole: jest.fn().mockResolvedValue(true),
    createNotification: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('creates ticket with sequential HD-XXXXXX identifier and initial history', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', isActive: true });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'emp-1',
        name: 'Jane Doe',
        email: 'jane@local',
      });
      mockPrisma.ticket.findFirst.mockResolvedValue({ ticketNumber: 'HD-000041' });
      mockPrisma.ticket.create.mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 'HD-000042',
        title: 'New keyboard needed',
        status: TicketStatus.NEW,
        requesterId: 'emp-1',
      });

      const ticket = await service.createTicket('emp-1', {
        title: 'New keyboard needed',
        description: 'Spacebar key is jammed.',
        categoryId: 'cat-1',
        priority: TicketPriority.LOW,
      });

      expect(ticket.ticketNumber).toBe('HD-000042');
      expect(mockPrisma.ticket.findFirst).toHaveBeenCalled();
      expect(mockPrisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketNumber: 'HD-000042',
            status: TicketStatus.NEW,
            requesterId: 'emp-1',
          }),
        }),
      );
      expect(mockNotifications.notifyRole).toHaveBeenCalledWith(
        Role.SUPPORT,
        expect.stringContaining('HD-000042'),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('findOne authorization', () => {
    it('denies employee from accessing another employee ticket (IDOR defense)', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 't-99',
        ticketNumber: 'HD-000099',
        requesterId: 'emp-OTHER',
      });

      await expect(service.findOne('t-99', { id: 'emp-1', role: Role.EMPLOYEE })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows employee to view their own ticket', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 't-1',
        ticketNumber: 'HD-000001',
        requesterId: 'emp-1',
      });

      const result = await service.findOne('t-1', { id: 'emp-1', role: Role.EMPLOYEE });
      expect(result.id).toBe('t-1');
    });

    it('allows support and manager to view any ticket', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 't-1',
        ticketNumber: 'HD-000001',
        requesterId: 'emp-OTHER',
      });

      const supportView = await service.findOne('t-1', mockSupport);
      const managerView = await service.findOne('t-1', mockManager);
      expect(supportView.id).toBe('t-1');
      expect(managerView.id).toBe('t-1');
    });
  });

  describe('updateStatus & state machine', () => {
    it('allows valid transition NEW -> IN_PROGRESS and logs history', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: 't-1',
        ticketNumber: 'HD-000001',
        status: TicketStatus.NEW,
        requesterId: 'emp-1',
      });
      mockPrisma.ticket.update.mockResolvedValue({
        id: 't-1',
        status: TicketStatus.IN_PROGRESS,
      });

      await service.updateStatus('t-1', mockSupport, {
        status: TicketStatus.IN_PROGRESS,
        reason: 'Starting diagnosis',
      });

      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: TicketStatus.IN_PROGRESS }),
        }),
      );
      expect(mockPrisma.ticketHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: HistoryEventType.STATUS_CHANGED,
            oldValue: TicketStatus.NEW,
            newValue: TicketStatus.IN_PROGRESS,
          }),
        }),
      );
    });

    it('rejects invalid status transition NEW -> RESOLVED', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: 't-1',
        ticketNumber: 'HD-000001',
        status: TicketStatus.NEW,
        requesterId: 'emp-1',
      });

      await expect(
        service.updateStatus('t-1', mockSupport, {
          status: TicketStatus.RESOLVED,
        }),
      ).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('rejects employee attempting to change internal support status', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: 't-1',
        ticketNumber: 'HD-000001',
        status: TicketStatus.IN_PROGRESS,
        requesterId: 'emp-1',
      });

      await expect(
        service.updateStatus('t-1', mockEmployee, {
          status: TicketStatus.RESOLVED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reopenTicket', () => {
    it('allows reopening a RESOLVED ticket and transitions to IN_PROGRESS', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: 't-1',
        ticketNumber: 'HD-000001',
        status: TicketStatus.RESOLVED,
        requesterId: 'emp-1',
        assigneeId: 'supp-1',
      });
      mockPrisma.ticket.update.mockResolvedValue({
        id: 't-1',
        status: TicketStatus.IN_PROGRESS,
      });

      await service.reopenTicket('t-1', mockEmployee, {
        reason: 'Display still flickers after HDMI replacement',
      });

      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TicketStatus.IN_PROGRESS,
            resolvedAt: null,
          }),
        }),
      );
      expect(mockPrisma.ticketHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: HistoryEventType.TICKET_REOPENED,
            oldValue: TicketStatus.RESOLVED,
            newValue: TicketStatus.IN_PROGRESS,
          }),
        }),
      );
    });

    it('rejects reopening a ticket that is not in RESOLVED status', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: 't-1',
        ticketNumber: 'HD-000001',
        status: TicketStatus.IN_PROGRESS,
        requesterId: 'emp-1',
      });

      await expect(service.reopenTicket('t-1', mockEmployee, { reason: 'Test' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
