import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AgentClientService } from '../agent-client/agent-client.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto, PreviewAnalysisDto } from './dto/post.dto';

const TRENDING_INTERACTIONS_THRESHOLD = 50;

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private agentClient: AgentClientService,
    private notificationsService: NotificationsService,
  ) {}

  async create(authorId: string, dto: CreatePostDto) {
    const attachments = dto.attachments ?? [];
    const post = await this.prisma.post.create({
      data: {
        authorId,
        type: dto.type,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        ...(attachments.length ? { attachments: { create: attachments } } : {}),
      },
      include: { attachments: true, category: true, aiAnalysis: true },
    });

    if (dto.type === 'PROBLEM') {
      this.runAiAnalysis(post.id, post.title, post.description, post.category.slug, attachments.map((a) => a.url)).catch(
        (err) => this.logger.error(`AI analysis failed for post ${post.id}`, err as Error),
      );
    }

    return post;
  }

  async previewAnalysis(dto: PreviewAnalysisDto) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    return this.agentClient.analyzeProblem({
      postId: 'preview',
      title: dto.title,
      description: dto.description,
      categorySlug: category.slug,
      attachmentUrls: [],
    });
  }

  private async runAiAnalysis(
    postId: string,
    title: string,
    description: string,
    categorySlug: string,
    attachmentUrls: string[],
  ) {
    const result = await this.agentClient.analyzeProblem({
      postId,
      title,
      description,
      categorySlug,
      attachmentUrls,
    });

    await this.prisma.aIAnalysis.create({
      data: {
        postId,
        diagnosis: result.diagnosis,
        suggestedSolutions: result.suggestedSolutions,
        confidenceScore: result.confidenceScore,
        rawResponse: result.raw as any,
      },
    });

    const systemAuthor = await this.prisma.user.findFirst({ where: { email: 'ai-agent@system.local' } });
    if (systemAuthor) {
      await this.prisma.comment.create({
        data: {
          postId,
          authorId: systemAuthor.id,
          content: result.diagnosis,
          isAIComment: true,
        },
      });
      await this.prisma.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });
    }
  }

  async findFeed(params: {
    categoryId?: string;
    type?: 'PROBLEM' | 'SOLUTION';
    status?: 'OPEN' | 'SOLVED' | 'CLOSED';
    trending?: boolean;
    take?: number;
    cursor?: string;
  }) {
    const { categoryId, type, status, trending, take = 20, cursor } = params;
    return this.prisma.post.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(trending ? { isTrending: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
        category: true,
        attachments: true,
        aiAnalysis: true,
        _count: { select: { comments: true, likes: true } },
      },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
        category: true,
        attachments: true,
        aiAnalysis: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');

    await this.prisma.post.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
    await this.checkTrending(id);

    return post;
  }

  async markSolved(postId: string, requesterId: string, solvedCommentId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== requesterId) {
      throw new ForbiddenException('Only the post author can mark it as solved');
    }

    const comment = await this.prisma.comment.findUnique({ where: { id: solvedCommentId } });
    if (!comment || comment.postId !== postId) {
      throw new BadRequestException('Comment does not belong to this post');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'SOLVED', solvedCommentId },
    });

    if (comment.authorId !== requesterId) {
      await this.notificationsService.create(comment.authorId, 'SOLVED', {
        postId,
        postTitle: post.title,
        commentId: solvedCommentId,
      });
    }

    return updated;
  }

  async toggleLike(userId: string, postId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      await this.prisma.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } });
      return { liked: false };
    }

    await this.prisma.like.create({ data: { userId, postId } });
    await this.prisma.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });
    await this.checkTrending(postId);
    return { liked: true };
  }

  async toggleFavorite(userId: string, postId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.favorite.create({ data: { userId, postId } });
    return { favorited: true };
  }

  async search(query: string, categoryId?: string) {
    return this.prisma.post.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { category: true, attachments: true },
      take: 30,
    });
  }

  private async checkTrending(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.isTrending) return;

    const interactions = post.likesCount + post.commentsCount;
    if (interactions >= TRENDING_INTERACTIONS_THRESHOLD) {
      await this.prisma.post.update({ where: { id: postId }, data: { isTrending: true } });
    }
  }
}
