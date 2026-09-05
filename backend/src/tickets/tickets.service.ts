import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ReassignTicketDto } from './dto/reassign-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { Role, TicketPriority, TicketStatus, HistoryEventType, Prisma } from '@prisma/client';
import { validateStatusTransition } from '@helpdesk/shared';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    // 1. Verify category exists and is active
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || !category.isActive) {
      throw new BadRequestException('Selected category is invalid or inactive');
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!requester) {
      throw new NotFoundException('Requester account not found');
    }

    // 2. Atomic database transaction to generate sequential number and create ticket + initial history
    const ticket = await this.prisma.$transaction(async (tx) => {
      const latestTicket = await tx.ticket.findFirst({
        orderBy: { ticketNumber: 'desc' },
        select: { ticketNumber: true },
      });

      let nextNum = 1;
      if (latestTicket && latestTicket.ticketNumber.startsWith('HD-')) {
        const parsed = parseInt(latestTicket.ticketNumber.replace('HD-', ''), 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }
      const ticketNumber = `HD-${String(nextNum).padStart(6, '0')}`;

      const created = await tx.ticket.create({
        data: {
          ticketNumber,
          title: dto.title.trim(),
          description: dto.description.trim(),
          categoryId: dto.categoryId,
          priority: dto.priority || TicketPriority.MEDIUM,
          status: TicketStatus.NEW,
          requesterId: userId,
          history: {
            create: {
              actorId: userId,
              eventType: HistoryEventType.TICKET_CREATED,
              newValue: 'Ticket created in NEW status',
              reason: 'Initial request submission',
            },
          },
        },
        include: {
          category: true,
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return created;
    });

    // 3. Notify support team of new incoming request
    this.notificationsService
      .notifyRole(
        Role.SUPPORT,
        `New Request: ${ticket.ticketNumber}`,
        `${requester.name} submitted: "${ticket.title}"`,
        `/support/requests/${ticket.id}`,
      )
      .catch((err) => this.logger.warn('Failed to dispatch support notifications:', err));

    return ticket;
  }

  async findAll(user: { id: string; role: Role }, query: QueryTicketsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {};

    // Strict Authorization Scoping
    if (user.role === Role.EMPLOYEE) {
      // Employees can only view their own requests
      where.requesterId = user.id;
    } else if (user.role === Role.SUPPORT) {
      if (query.unassignedOnly === true || query.unassignedOnly === 'true') {
        where.assigneeId = null;
      } else if (query.ownerId) {
        where.assigneeId = query.ownerId;
      }
    } else if (user.role === Role.MANAGER) {
      if (query.ownerId) {
        where.assigneeId = query.ownerId;
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(idOrNumber: string, user: { id: string; role: Role }) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrNumber,
    );

    const ticket = await this.prisma.ticket.findFirst({
      where: isUuid ? { id: idOrNumber } : { ticketNumber: idOrNumber.toUpperCase() },
      include: {
        category: true,
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
        history: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket '${idOrNumber}' not found`);
    }

    // Backend Authorization Rule: Employees cannot access other employees' tickets
    if (user.role === Role.EMPLOYEE && ticket.requesterId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this ticket');
    }

    return ticket;
  }

  async updateStatus(ticketId: string, user: { id: string; role: Role }, dto: UpdateStatusDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignee: true,
        requester: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Employees cannot freely change ticket status (only support and manager)
    if (user.role === Role.EMPLOYEE) {
      throw new ForbiddenException('Employees are not authorized to directly change ticket status');
    }

    // Validate Status State Machine
    validateStatusTransition(ticket.status as any, dto.status as any);

    // Prepare timestamp updates
    const now = new Date();
    const updateData: Prisma.TicketUpdateInput = {
      status: dto.status,
    };

    let eventType: HistoryEventType = HistoryEventType.STATUS_CHANGED;
    if (dto.status === TicketStatus.RESOLVED) {
      updateData.resolvedAt = now;
      eventType = HistoryEventType.TICKET_RESOLVED;
    } else if (dto.status === TicketStatus.CLOSED) {
      updateData.closedAt = now;
      eventType = HistoryEventType.TICKET_CLOSED;
    } else if (ticket.status === TicketStatus.RESOLVED && dto.status === TicketStatus.IN_PROGRESS) {
      eventType = HistoryEventType.TICKET_REOPENED;
      updateData.resolvedAt = null;
    }

    // Atomic transaction: Update Ticket + Append History
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          category: true,
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          eventType,
          oldValue: ticket.status,
          newValue: dto.status,
          reason: dto.reason || `Status transitioned from ${ticket.status} to ${dto.status}`,
        },
      });

      return updatedTicket;
    });

    // In-app notification to requester
    this.notificationsService
      .createNotification(
        ticket.requesterId,
        `Ticket ${ticket.ticketNumber} Updated`,
        `Status changed to ${dto.status}${dto.reason ? `: ${dto.reason}` : ''}`,
        `/requests/${ticket.id}`,
      )
      .catch((err) => this.logger.warn('Failed to send status update notification:', err));

    return updated;
  }

  async assignTicket(ticketId: string, user: { id: string; role: Role }, dto: AssignTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { assignee: true, requester: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Determine target assignee: If dto.assigneeId provided, use it; otherwise claiming self
    const targetUserId = dto.assigneeId || user.id;

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException('Target assignee is invalid or inactive');
    }

    if (targetUser.role !== Role.SUPPORT && targetUser.role !== Role.MANAGER) {
      throw new BadRequestException('Tickets can only be assigned to Support or Manager staff');
    }

    // If support staff is assigning to someone else, check permission
    if (user.role === Role.SUPPORT && dto.assigneeId && dto.assigneeId !== user.id) {
      // Support staff is reassigning
    }

    const isReassignment = !!ticket.assigneeId && ticket.assigneeId !== targetUserId;
    const oldAssigneeName = ticket.assignee?.name || 'Unassigned';

    // When claiming an unassigned ticket in NEW status, automatically advance to IN_PROGRESS
    const nextStatus =
      ticket.status === TicketStatus.NEW ? TicketStatus.IN_PROGRESS : ticket.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          assigneeId: targetUserId,
          status: nextStatus,
        },
        include: {
          category: true,
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          eventType: isReassignment
            ? HistoryEventType.TICKET_REASSIGNED
            : HistoryEventType.TICKET_ASSIGNED,
          oldValue: oldAssigneeName,
          newValue: targetUser.name,
          reason:
            dto.reason || (isReassignment ? 'Ticket reassigned' : 'Ticket claimed / assigned'),
        },
      });

      if (ticket.status === TicketStatus.NEW && nextStatus === TicketStatus.IN_PROGRESS) {
        await tx.ticketHistory.create({
          data: {
            ticketId,
            actorId: user.id,
            eventType: HistoryEventType.STATUS_CHANGED,
            oldValue: TicketStatus.NEW,
            newValue: TicketStatus.IN_PROGRESS,
            reason: 'Automatically advanced to IN_PROGRESS upon assignment',
          },
        });
      }

      return result;
    });

    // Notify new assignee if not self
    if (targetUserId !== user.id) {
      this.notificationsService
        .createNotification(
          targetUserId,
          `Ticket Assigned: ${ticket.ticketNumber}`,
          `You were assigned ticket: "${ticket.title}"`,
          `/support/requests/${ticket.id}`,
        )
        .catch((err) => this.logger.warn('Failed to notify assignee:', err));
    }

    // Notify requester
    this.notificationsService
      .createNotification(
        ticket.requesterId,
        `Ticket Assigned: ${ticket.ticketNumber}`,
        `Your ticket was assigned to ${targetUser.name}`,
        `/requests/${ticket.id}`,
      )
      .catch((err) => this.logger.warn('Failed to notify requester:', err));

    return updated;
  }

  async reassignTicket(ticketId: string, user: { id: string; role: Role }, dto: ReassignTicketDto) {
    return this.assignTicket(ticketId, user, {
      assigneeId: dto.assigneeId,
      reason: dto.reason,
    });
  }

  async reopenTicket(ticketId: string, user: { id: string; role: Role }, dto: ReopenTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { assignee: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new BadRequestException(
        `Only tickets in RESOLVED status can be reopened. Current status: ${ticket.status}`,
      );
    }

    // Employees can reopen their own tickets, or support/manager can reopen
    if (user.role === Role.EMPLOYEE && ticket.requesterId !== user.id) {
      throw new ForbiddenException('You cannot reopen another employee ticket');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.IN_PROGRESS,
          resolvedAt: null,
        },
        include: {
          category: true,
          requester: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId,
          actorId: user.id,
          eventType: HistoryEventType.TICKET_REOPENED,
          oldValue: TicketStatus.RESOLVED,
          newValue: TicketStatus.IN_PROGRESS,
          reason: dto.reason,
        },
      });

      return result;
    });

    // Notify assignee if assigned
    if (ticket.assigneeId) {
      this.notificationsService
        .createNotification(
          ticket.assigneeId,
          `Ticket Reopened: ${ticket.ticketNumber}`,
          `Ticket was reopened: "${dto.reason}"`,
          `/support/requests/${ticket.id}`,
        )
        .catch((err) => this.logger.warn('Failed to notify assignee of reopen:', err));
    }

    return updated;
  }

  async getHistory(ticketId: string, user: { id: string; role: Role }) {
    // Check permission via findOne first
    await this.findOne(ticketId, user);

    return this.prisma.ticketHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }
}
