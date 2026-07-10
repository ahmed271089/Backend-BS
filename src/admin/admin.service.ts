import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CATEGORY_COLORS = ['#6C5CE7', '#3B82F6', '#F59E0B', '#22C55E', '#EAB308', '#06B6D4'];

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalSolved, expertsVerified, activeProblems, totalProblems, categories, recentReports, leaderboard, postsLast7Days] =
      await Promise.all([
        this.prisma.post.count({ where: { status: 'SOLVED' } }),
        this.prisma.user.count({ where: { isVerified: true } }),
        this.prisma.post.count({ where: { status: 'OPEN', type: 'PROBLEM' } }),
        this.prisma.post.count({ where: { type: 'PROBLEM' } }),
        this.prisma.category.findMany({
          include: {
            posts: { select: { status: true } },
            _count: { select: { posts: true } },
          },
        }),
        this.prisma.report.findMany({
          where: { status: 'PENDING' },
          include: { reporter: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        this.prisma.user.findMany({
          orderBy: { reputationPoints: 'desc' },
          take: 5,
          include: { expertise: { include: { category: true }, orderBy: { points: 'desc' }, take: 1 } },
        }),
        this.getPostsPerDay(7),
      ]);

    const successRate = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;

    const categoryHealth = categories.map((c, i) => {
      const openCount = c.posts.filter((p) => p.status === 'OPEN').length;
      const solvedCount = c.posts.filter((p) => p.status === 'SOLVED').length;
      const total = c.posts.length;
      const solvedRate = total > 0 ? Math.round((solvedCount / total) * 100) : 0;
      return {
        id: c.id,
        name: c.name,
        openCount,
        solvedRate,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      };
    });

    const moderationQueue = await Promise.all(
      recentReports.map(async (r) => {
        let title = 'Reported content';
        if (r.targetType === 'POST') {
          const post = await this.prisma.post.findUnique({ where: { id: r.targetId } });
          if (post) title = post.title;
        }
        return {
          id: r.id,
          type: r.targetType,
          title,
          reason: r.reason,
          reportedBy: r.reporter.name,
          createdAt: r.createdAt,
        };
      }),
    );

    const leaderboardPreview = leaderboard.map((u, i) => ({
      id: u.id,
      rank: i + 1,
      name: u.name,
      category: u.expertise[0]?.category.name ?? 'General',
      points: u.reputationPoints,
    }));

    return {
      platformStats: {
        totalSolved,
        expertsVerified,
        successRate: `${successRate}%`,
        activeProblems,
      },
      categoryHealth,
      platformLoadSeries: postsLast7Days,
      moderationQueue,
      leaderboard: leaderboardPreview,
    };
  }

  private async getPostsPerDay(days: number) {
    const result: { day: string; posts: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await this.prisma.post.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
      });

      result.push({
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        posts: count,
      });
    }

    return result;
  }

  private async getAdminName(adminId: string): Promise<string> {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
    return admin?.name ?? 'Admin';
  }

  async updatePostVisibility(id: string, isHidden: boolean, adminId: string) {
    const actorName = await this.getAdminName(adminId);
    await this.prisma.moderationAudit.create({
      data: { actorId: adminId, actorName, action: isHidden ? 'HIDE' : 'RESTORE', targetType: 'POST', targetId: id }
    });
    return this.prisma.post.update({
      where: { id },
      data: { isHidden }
    });
  }

  async deletePost(id: string, adminId: string) {
    const actorName = await this.getAdminName(adminId);
    await this.prisma.moderationAudit.create({
      data: { actorId: adminId, actorName, action: 'DELETE', targetType: 'POST', targetId: id }
    });
    return this.prisma.post.delete({ where: { id } });
  }

  async updateCommentVisibility(id: string, isHidden: boolean, adminId: string) {
    const actorName = await this.getAdminName(adminId);
    await this.prisma.moderationAudit.create({
      data: { actorId: adminId, actorName, action: isHidden ? 'HIDE' : 'RESTORE', targetType: 'COMMENT', targetId: id }
    });
    return this.prisma.comment.update({
      where: { id },
      data: { isHidden }
    });
  }

  async deleteComment(id: string, adminId: string) {
    const actorName = await this.getAdminName(adminId);
    await this.prisma.moderationAudit.create({
      data: { actorId: adminId, actorName, action: 'DELETE', targetType: 'COMMENT', targetId: id }
    });
    return this.prisma.comment.delete({ where: { id } });
  }

  // --- USER MANAGEMENT ---

  async getUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as any } },
        { email: { contains: search, mode: 'insensitive' as any } },
      ]
    } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          reputationPoints: true,
          isVerified: true,
        },
        orderBy: { reputationPoints: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      pageCount: Math.ceil(total / limit),
    };
  }

  async updateUserRole(id: string, role: 'USER' | 'ADMIN', adminId: string) {
    const actorName = await this.getAdminName(adminId);
    await this.prisma.moderationAudit.create({
      data: { actorId: adminId, actorName, action: `ROLE_${role}`, targetType: 'USER', targetId: id }
    });
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, role: true },
    });
  }

  async updateUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED', adminId: string) {
    const actorName = await this.getAdminName(adminId);
    await this.prisma.moderationAudit.create({
      data: { actorId: adminId, actorName, action: `STATUS_${status}`, targetType: 'USER', targetId: id }
    });
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, status: true },
    });
  }

  async deleteUser(id: string, adminId: string) {
    const actorName = await this.getAdminName(adminId);
    await this.prisma.moderationAudit.create({
      data: { actorId: adminId, actorName, action: 'DELETE', targetType: 'USER', targetId: id }
    });
    return this.prisma.user.delete({ where: { id } });
  }

  // --- CATEGORY MANAGEMENT ---

  async createCategory(name: string, slug: string, icon: string | null) {
    return this.prisma.category.create({
      data: { name, slug, icon }
    });
  }

  async updateCategory(id: string, name?: string, slug?: string, icon?: string | null) {
    return this.prisma.category.update({
      where: { id },
      data: { name, slug, icon }
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
