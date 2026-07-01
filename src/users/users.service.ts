import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async search(query: string, take = 20) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return this.prisma.user.findMany({
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
  }

  async updateProfile(id: string, data: { name?: string; bio?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_USER_SELECT,
    });
  }

  // Called when a post is marked solved + reward given to the contributor.
  async addReputation(userId: string, categoryId: string, points: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { reputationPoints: { increment: points } },
    });

    await this.prisma.categoryExpertise.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      update: { points: { increment: points } },
      create: { userId, categoryId, points },
    });
  }

  async getLeaderboard(categoryId?: string, take = 20) {
    if (categoryId) {
      return this.prisma.categoryExpertise.findMany({
        where: { categoryId },
        orderBy: { points: 'desc' },
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              reputationPoints: true,
              isVerified: true,
            },
          },
          category: true,
        },
      });
    }
    return this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { reputationPoints: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        reputationPoints: true,
        isVerified: true,
      },
    });
  }

  async suspend(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: PUBLIC_USER_SELECT,
    });
  }

  async ban(id: string) {
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
}
