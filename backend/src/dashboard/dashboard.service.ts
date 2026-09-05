import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmployeeMetrics(userId: string) {
    const [total, open, waiting, resolved, recentTickets] = await Promise.all([
      this.prisma.ticket.count({
        where: { requesterId: userId },
      }),
      this.prisma.ticket.count({
        where: {
          requesterId: userId,
          status: { in: [TicketStatus.NEW, TicketStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.ticket.count({
        where: {
          requesterId: userId,
          status: TicketStatus.WAITING,
        },
      }),
      this.prisma.ticket.count({
        where: {
          requesterId: userId,
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
      }),
      this.prisma.ticket.findMany({
        where: { requesterId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          category: true,
          assignee: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return {
      metrics: {
        total,
        open,
        waiting,
        resolved,
      },
      recentTickets,
    };
  }

  async getSupportMetrics(userId: string) {
    const [unassignedQueue, myAssigned, myWaiting, myResolved, urgentCount, recentQueue] =
      await Promise.all([
        this.prisma.ticket.count({
          where: {
            assigneeId: null,
            status: { in: [TicketStatus.NEW, TicketStatus.IN_PROGRESS] },
          },
        }),
        this.prisma.ticket.count({
          where: {
            assigneeId: userId,
            status: { in: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING] },
          },
        }),
        this.prisma.ticket.count({
          where: {
            assigneeId: userId,
            status: TicketStatus.WAITING,
          },
        }),
        this.prisma.ticket.count({
          where: {
            assigneeId: userId,
            status: TicketStatus.RESOLVED,
          },
        }),
        this.prisma.ticket.count({
          where: {
            priority: TicketPriority.URGENT,
            status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          },
        }),
        this.prisma.ticket.findMany({
          where: {
            OR: [
              { assigneeId: null },
              { assigneeId: userId },
            ],
            status: { notIn: [TicketStatus.CLOSED] },
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
          include: {
            category: true,
            requester: {
              select: { id: true, name: true, email: true },
            },
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
      ]);

    return {
      metrics: {
        unassignedQueue,
        myAssigned,
        myWaiting,
        myResolved,
        urgentCount,
      },
      recentQueue,
    };
  }

  async getManagerMetrics() {
    const [
      total,
      open,
      waiting,
      resolved,
      closed,
      supportUsers,
      categoryGroups,
      priorityGroups,
    ] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({
        where: { status: { in: [TicketStatus.NEW, TicketStatus.IN_PROGRESS] } },
      }),
      this.prisma.ticket.count({
        where: { status: TicketStatus.WAITING },
      }),
      this.prisma.ticket.count({
        where: { status: TicketStatus.RESOLVED },
      }),
      this.prisma.ticket.count({
        where: { status: TicketStatus.CLOSED },
      }),
      this.prisma.user.findMany({
        where: { role: Role.SUPPORT, isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          assignedTickets: {
            select: {
              status: true,
            },
          },
        },
      }),
      this.prisma.ticket.groupBy({
        by: ['categoryId'],
        _count: { id: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
    ]);

    // Format workload per support staff member
    const workload = supportUsers.map((user) => {
      const activeTicketsCount = user.assignedTickets.filter(
        (t) => t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.WAITING,
      ).length;
      const resolvedCount = user.assignedTickets.filter(
        (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED,
      ).length;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        activeTicketsCount,
        resolvedCount,
        totalAssigned: user.assignedTickets.length,
      };
    });

    // Resolve category names for category breakdown
    const categories = await this.prisma.category.findMany();
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const byCategory = categoryGroups.map((cg) => ({
      categoryId: cg.categoryId,
      categoryName: categoryMap.get(cg.categoryId) || 'Unknown',
      count: cg._count.id,
    }));

    const byPriority = priorityGroups.map((pg) => ({
      priority: pg.priority,
      count: pg._count.id,
    }));

    return {
      overview: {
        total,
        open,
        waiting,
        resolved,
        closed,
      },
      workload,
      byCategory,
      byPriority,
    };
  }
}
