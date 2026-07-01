import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportStatus, TargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  create(reporterId: string, targetType: TargetType, targetId: string, reason: string) {
    return this.prisma.report.create({
      data: { reporterId, targetType, targetId, reason },
    });
  }

  async listPending() {
    const reports = await this.prisma.report.findMany({
      where: { status: 'PENDING' },
      include: { reporter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(reports.map((r) => this.enrichReport(r)));
  }

  async updateStatus(id: string, status: ReportStatus) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id },
      data: { status },
      include: { reporter: { select: { id: true, name: true, email: true } } },
    });

    return this.enrichReport(updated);
  }

  private async enrichReport(report: {
    id: string;
    targetType: TargetType;
    targetId: string;
    reason: string;
    status: ReportStatus;
    createdAt: Date;
    reporter: { id: string; name: string; email: string | null };
  }) {
    let title = 'Unknown content';
    let submittedBy = 'Unknown';

    if (report.targetType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: report.targetId },
        include: { author: { select: { name: true } } },
      });
      if (post) {
        title = post.title;
        submittedBy = post.author.name;
      }
    } else if (report.targetType === 'COMMENT') {
      const comment = await this.prisma.comment.findUnique({
        where: { id: report.targetId },
        include: { author: { select: { name: true } }, post: { select: { title: true } } },
      });
      if (comment) {
        title = comment.post.title;
        submittedBy = comment.author.name;
      }
    } else if (report.targetType === 'USER') {
      const user = await this.prisma.user.findUnique({ where: { id: report.targetId } });
      if (user) {
        title = user.name;
        submittedBy = user.name;
      }
    }

    return {
      id: report.id,
      type: report.targetType,
      title,
      reason: report.reason,
      status: report.status,
      reportedBy: report.reporter.name,
      submittedBy,
      createdAt: report.createdAt,
    };
  }
}
