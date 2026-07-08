import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { TargetType } from '@prisma/client';
import { getReputationLevel, getReputationProgress } from '../common/constants/reputation.constants';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  name: true,
  avatarUrl: true,
  bio: true,
  provider: true,
  role: true,
  status: true,
  reputationPoints: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  expertise: { include: { category: true } },
  _count: {
    select: {
      posts: true,
      comments: true,
    },
  },
} as const;

function withReputationLevel<T extends { reputationPoints: number }>(user: T) {
  const progress = getReputationProgress(user.reputationPoints);
  return { 
    ...user, 
    reputationLevel: getReputationLevel(user.reputationPoints),
    nextLevel: progress.nextLevel,
    nextLevelPoints: progress.nextLevelPoints,
    currentLevelPoints: progress.currentLevelPoints,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    
    const rank = await this.prisma.user.count({
      where: { reputationPoints: { gt: user.reputationPoints } }
    }) + 1;

    const activityScore = user._count.posts + user._count.comments;

    return {
      ...withReputationLevel(user),
      rank,
      activityScore,
    };
  }

  async search(query: string, take = 20) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { email: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        reputationPoints: true,
        isVerified: true,
      },
      take,
      orderBy: { name: 'asc' },
    });
    
    return users.map(withReputationLevel);
  }

  async updateProfile(id: string, data: { name?: string; bio?: string; avatarUrl?: string }) {
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_USER_SELECT,
    });
    return withReputationLevel(updated as any);
  }

  // Called when a post is marked solved + reward given to the contributor.
  async addReputation(
    userId: string,
    categoryId: string | null,
    points: number,
    action: string,
    targetId?: string,
    targetType?: TargetType,
  ) {
    if (points === 0) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { reputationPoints: true },
    });
    if (!user) return;

    const oldLevel = getReputationLevel(user.reputationPoints);
    const newLevel = getReputationLevel(user.reputationPoints + points);

    await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { reputationPoints: { increment: points } },
      });

      if (categoryId) {
        await tx.categoryExpertise.upsert({
          where: { userId_categoryId: { userId, categoryId } },
          update: { points: { increment: points } },
          create: { userId, categoryId, points },
        });
      }

      await tx.reputationHistory.create({
        data: {
          userId,
          categoryId,
          action,
          points,
          targetId,
          targetType,
        },
      });

      if (newLevel !== oldLevel && points > 0) {
        await tx.notification.create({
          data: {
            userId,
            type: 'SYSTEM',
            payload: {
              event: 'LEVEL_UP',
              message: `Congratulations! You have reached the ${newLevel} level!`,
              newLevel,
            },
          },
        });
        
        // Trigger real-time notification
        this.chatGateway.emitToUser(userId, 'level_up', { newLevel });
      }

      if (points !== 0) {
        this.chatGateway.emitToUser(userId, 'reputation_update', {
          points,
          action,
          newTotal: updatedUser.reputationPoints,
          message: points > 0 ? `+${points} points for ${action}` : `${points} points for ${action}`,
        });
      }
    });
  }

  async getLeaderboard(categoryId?: string, take = 20) {
    if (categoryId) {
      const items = await this.prisma.categoryExpertise.findMany({
        where: { categoryId },
        orderBy: [
          { points: 'desc' },
          { user: { reputationPoints: 'desc' } }
        ],
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              reputationPoints: true,
              isVerified: true,
              _count: {
                select: { posts: true, comments: true },
              },
            },
          },
          category: true,
        },
      });
      return items.map(item => ({
        ...item,
        user: withReputationLevel(item.user),
        reputationLevel: getReputationLevel(item.points),
        activityScore: item.user._count.posts + item.user._count.comments,
      }));
    }
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { reputationPoints: 'desc' },
        { posts: { _count: 'desc' } },
        { comments: { _count: 'desc' } }
      ],
      take,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        reputationPoints: true,
        isVerified: true,
        _count: {
          select: { posts: true, comments: true },
        },
      },
    });
    return users.map(user => ({
      ...withReputationLevel(user),
      activityScore: user._count.posts + user._count.comments,
      _count: undefined, // remove the raw Prisma _count object for cleaner API response
    }));
  }

  async suspend(id: string, adminId?: string) {
    if (adminId) {
      const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
      await this.prisma.moderationAudit.create({
        data: { actorId: adminId, actorName: admin?.name ?? 'Admin', action: 'SUSPEND', targetType: 'USER', targetId: id }
      });
    }
    return this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: PUBLIC_USER_SELECT,
    });
  }

  async ban(id: string, adminId?: string) {
    if (adminId) {
      const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
      await this.prisma.moderationAudit.create({
        data: { actorId: adminId, actorName: admin?.name ?? 'Admin', action: 'BAN', targetType: 'USER', targetId: id }
      });
    }
    return this.prisma.user.update({
      where: { id },
      data: { status: 'BANNED' },
      select: PUBLIC_USER_SELECT,
    });
  }

  async verify(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isVerified: true },
      select: PUBLIC_USER_SELECT,
    });
  }

  async reactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: PUBLIC_USER_SELECT,
    });
  }

  async listUsers(q?: string, take = 50) {
    const users = await this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
        reputationPoints: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return users.map(withReputationLevel);
  }
}
