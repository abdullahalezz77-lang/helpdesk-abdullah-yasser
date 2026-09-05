import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(userId: string, title: string, message: string, link?: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        link,
      },
    });
  }

  async notifyRole(role: Role, title: string, message: string, link?: string) {
    const users = await this.prisma.user.findMany({
      where: { role, isActive: true },
      select: { id: true },
    });

    if (users.length === 0) return;

    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        link,
      })),
    });
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
