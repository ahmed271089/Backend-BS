import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { expertise: { include: { category: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, data: { name?: string; bio?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id }, data });
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
        include: { user: true, category: true },
      });
    }
    return this.prisma.user.findMany({
      orderBy: { reputationPoints: 'desc' },
      take,
    });
  }

  async suspend(id: string) {
    return this.prisma.user.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }

  async ban(id: string) {
    return this.prisma.user.update({ where: { id }, data: { status: 'BANNED' } });
  }

  async verify(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isVerified: true } });
  }
}
