import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportStatus, TargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgentClientService } from '../agent-client/agent-client.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../modules/mail/mail.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private agentClient: AgentClientService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  async create(reporterId: string, targetType: TargetType, targetId: string, reason: string, details?: string) {
    const report = await this.prisma.report.create({
      data: { reporterId, targetType, targetId, reason, details },
    });

    // Check threshold first
    await this.checkThresholdAndApplyAction(targetType, targetId);

    this.moderateReportAsync(report).catch(e => console.error("Moderation error:", e));

    return report;
  }

  private async notifyAdmins(targetType: string, targetId: string, action: string, explanation: string, reason: string) {
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' } });
    if (admins.length === 0) return;

    for (const admin of admins) {
      await this.notificationsService.create(admin.id, 'SYSTEM', {
        title: `Moderation Alert: ${action}`,
        message: `Target: ${targetType} - Action: ${action}. Reason: ${explanation}`,
        targetId,
      });

      if (admin.email) {
        await this.mailService.send({
          to: admin.email,
          subject: `[Admin] Moderation Alert: ${action}`,
          html: `<p>A moderation event for <b>${targetType}</b> (${targetId}) was triggered.</p>
                 <p><b>Action:</b> ${action}</p>
                 <p><b>Explanation:</b> ${explanation}</p>
                 <p><b>Context Reason:</b> ${reason}</p>`,
        });
      }
    }
  }

  private async hideContent(targetType: TargetType, targetId: string) {
    if (targetType === 'POST') {
      await this.prisma.post.update({
        where: { id: targetId },
        data: { isHidden: true },
      }).catch(() => null);
    } else if (targetType === 'COMMENT') {
      await this.prisma.comment.update({
        where: { id: targetId },
        data: { isHidden: true },
      }).catch(() => null);
    } else if (targetType === 'USER') {
      await this.prisma.user.update({
        where: { id: targetId },
        data: { status: 'SUSPENDED' },
      }).catch(() => null);
    }
  }

  private async checkThresholdAndApplyAction(targetType: TargetType, targetId: string) {
    const THRESHOLD = 5;
    const count = await this.prisma.report.count({
      where: { targetType, targetId },
    });

    if (count >= THRESHOLD) {
      await this.hideContent(targetType, targetId);

      await this.prisma.moderationAudit.create({
        data: {
          actorName: 'SYSTEM',
          action: 'AUTO_HIDE_THRESHOLD',
          targetType,
          targetId,
          reason: 'Report threshold reached'
        }
      });

      await this.prisma.report.updateMany({
        where: { targetType, targetId, status: 'PENDING' },
        data: { status: 'ACTION_TAKEN' },
      });

      await this.notifyAdmins(targetType, targetId, 'ACTION_TAKEN', 'Report threshold reached. Automatically hid content.', 'Multiple user reports');
    }
  }

  private async moderateReportAsync(report: { id: string; targetType: TargetType; targetId: string; reason: string; details: string | null }) {
    const res = await this.agentClient.moderateReport({
      reportId: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      details: report.details,
    });

    if (res.action === 'DISMISSED' || res.action === 'ACTION_TAKEN') {
      await this.prisma.report.update({
        where: { id: report.id },
        data: { status: res.action },
      });

      await this.prisma.moderationAudit.create({
        data: {
          actorName: 'AI_AGENT',
          action: res.action === 'ACTION_TAKEN' ? 'AI_HIDE_REPORT' : 'AI_DISMISS_REPORT',
          targetType: report.targetType,
          targetId: report.targetId,
          reason: res.explanation
        }
      });

      if (res.action === 'ACTION_TAKEN') {
        await this.hideContent(report.targetType, report.targetId);
      }
    }

    await this.notifyAdmins(report.targetType, report.targetId, res.action, res.explanation, report.reason);
  }

  async listPending() {
    const reports = await this.prisma.report.findMany({
      where: { status: 'PENDING' },
      include: { reporter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(reports.map((r) => this.enrichReport(r)));
  }

  async listHistory(take = 50, skip = 0) {
    const reports = await this.prisma.report.findMany({
      where: { status: { not: 'PENDING' } },
      include: { reporter: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
    });

    return Promise.all(reports.map((r) => this.enrichReport(r)));
  }

  async getReportDetails(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { reporter: { select: { id: true, name: true, email: true } } },
    });
    if (!report) throw new NotFoundException('Report not found');
    
    let targetContent = null;
    if (report.targetType === 'POST') {
      targetContent = await this.prisma.post.findUnique({
        where: { id: report.targetId },
        include: { author: { select: { name: true, email: true } }, attachments: true },
      });
    } else if (report.targetType === 'COMMENT') {
      targetContent = await this.prisma.comment.findUnique({
        where: { id: report.targetId },
        include: { author: { select: { name: true, email: true } }, post: { select: { title: true } } },
      });
    } else if (report.targetType === 'USER') {
      targetContent = await this.prisma.user.findUnique({
        where: { id: report.targetId },
        select: { id: true, name: true, email: true, bio: true, avatarUrl: true, status: true },
      });
    }
    
    const enriched = await this.enrichReport(report);
    return {
      ...enriched,
      targetContent,
    };
  }

  async updateStatus(id: string, status: ReportStatus, adminId?: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id },
      data: { status },
      include: { reporter: { select: { id: true, name: true, email: true } } },
    });

    if (adminId) {
      const admin = await this.prisma.user.findUnique({ where: { id: adminId }, select: { name: true } });
      await this.prisma.moderationAudit.create({
        data: {
          actorId: adminId,
          actorName: admin?.name ?? 'Admin',
          action: status === 'ACTION_TAKEN' ? 'HIDE_FROM_REPORT' : 'DISMISS_REPORT',
          targetType: report.targetType,
          targetId: report.targetId,
          reason: report.reason
        }
      });
    }

    if (status === 'ACTION_TAKEN') {
      await this.hideContent(report.targetType, report.targetId);
    }

    return this.enrichReport(updated);
  }

  private async enrichReport(report: {
    id: string;
    targetType: TargetType;
    targetId: string;
    reason: string;
    details: string | null;
    status: ReportStatus;
    createdAt: Date;
    reporter: { id: string; name: string; email: string | null };
  }) {
    let title = 'Unknown content';
    let submittedBy = 'Unknown';
    let targetAuthorId = '';

    if (report.targetType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: report.targetId },
        include: { author: { select: { id: true, name: true } } },
      });
      if (post) {
        title = post.title;
        submittedBy = post.author.name;
        targetAuthorId = post.author.id;
      }
    } else if (report.targetType === 'COMMENT') {
      const comment = await this.prisma.comment.findUnique({
        where: { id: report.targetId },
        include: { author: { select: { id: true, name: true } }, post: { select: { title: true } } },
      });
      if (comment) {
        title = comment.post.title;
        submittedBy = comment.author.name;
        targetAuthorId = comment.author.id;
      }
    } else if (report.targetType === 'USER') {
      const user = await this.prisma.user.findUnique({ where: { id: report.targetId } });
      if (user) {
        title = user.name;
        submittedBy = user.name;
        targetAuthorId = user.id;
      }
    }

    const auditLog = await this.prisma.moderationAudit.findFirst({
      where: { targetId: report.targetId },
      orderBy: { createdAt: 'desc' },
      select: { action: true, actorName: true }
    });

    return {
      id: report.id,
      type: report.targetType,
      targetId: report.targetId,
      targetAuthorId,
      title,
      reason: report.reason,
      details: report.details,
      status: report.status,
      reportedBy: report.reporter.name,
      submittedBy,
      createdAt: report.createdAt,
      audit: auditLog,
    };
  }
}
