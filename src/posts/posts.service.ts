import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AgentClientService } from '../agent-client/agent-client.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto, PreviewAnalysisDto } from './dto/post.dto';
import { REPUTATION_RULES } from '../common/constants/reputation.constants';

const TRENDING_INTERACTIONS_THRESHOLD = 50;

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private agentClient: AgentClientService,
    private notificationsService: NotificationsService,
  ) { }

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

    await this.usersService.addReputation(authorId, post.categoryId, REPUTATION_RULES.CREATE_POST, 'CREATE_POST', post.id, 'POST');

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
    authorId?: string;
    requestUserId?: string;
  }) {
    const { categoryId, type, status, trending, take = 20, cursor, authorId, requestUserId } = params;
    const posts = await this.prisma.post.findMany({
      where: {
        isHidden: false,
        ...(categoryId ? { categoryId } : {}),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(authorId ? { authorId } : {}),
      },
      orderBy: trending
        ? [
          { isTrending: 'desc' as const },
          { createdAt: 'desc' as const },
        ]
        : { createdAt: 'desc' as const },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
        category: true,
        attachments: true,
        aiAnalysis: true,
        comments: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { id: true, name: true, avatarUrl: true } } }
        },
        _count: { select: { comments: true, likes: true } },
        favorites: requestUserId ? { where: { userId: requestUserId } } : false,
        likes: requestUserId ? { where: { userId: requestUserId } } : false,
      },
    });

    return posts.map(p => {
      const isSaved = p.favorites ? p.favorites.length > 0 : false;
      const isLiked = p.likes ? p.likes.length > 0 : false;
      delete (p as any).favorites;
      delete (p as any).likes;
      return { ...p, isSaved, isLiked };
    });
  }

  async findMyPosts(userId: string, cursor?: string) {
    const posts = await this.prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
        category: true,
        attachments: true,
        aiAnalysis: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { id: true, name: true, avatarUrl: true } } }
        },
        _count: { select: { comments: true, likes: true } },
        favorites: { where: { userId } },
        likes: { where: { userId } },
      },
    });

    return posts.map(p => {
      const isSaved = p.favorites ? p.favorites.length > 0 : false;
      const isLiked = p.likes ? p.likes.length > 0 : false;
      delete (p as any).favorites;
      delete (p as any).likes;
      return { ...p, isSaved, isLiked };
    });
  }

  async findOne(id: string, requestUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
        category: true,
        attachments: true,
        aiAnalysis: true,
        comments: {
          where: { isHidden: false },
          orderBy: { createdAt: 'asc' },
          include: { 
            author: { select: { id: true, name: true, avatarUrl: true } },
            likes: requestUserId ? { where: { userId: requestUserId } } : false,
          },
        },
        favorites: requestUserId ? { where: { userId: requestUserId } } : false,
        likes: requestUserId ? { where: { userId: requestUserId } } : false,
      },
    });
    if (!post || post.isHidden) throw new NotFoundException('Post not found');

    await this.prisma.post.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
    await this.checkTrending(id);

    const isSaved = post.favorites ? post.favorites.length > 0 : false;
    const isLiked = post.likes ? post.likes.length > 0 : false;
    
    const mappedComments = post.comments.map(c => {
      const userVote = c.likes && c.likes.length > 0 ? c.likes[0].value : 0;
      delete (c as any).likes;
      return { ...c, userVote };
    });

    delete (post as any).favorites;
    delete (post as any).likes;

    return { ...post, isSaved, isLiked, comments: mappedComments };
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
      this.notificationsService.create(comment.authorId, 'SOLVED', {
        postId,
        postTitle: post.title,
        commentId: solvedCommentId,
      }).catch(err => this.logger.error('Failed to enqueue notification', err));
      await this.usersService.addReputation(comment.authorId, post.categoryId, REPUTATION_RULES.MARK_SOLVED, 'MARK_SOLVED', comment.id, 'COMMENT');
    }

    return updated;
  }

  async deleteAll(requesterId: string) {
    const posts = await this.prisma.post.findMany({ where: { authorId: requesterId }, select: { id: true, categoryId: true } });
    for (const p of posts) {
      await this.usersService.addReputation(requesterId, p.categoryId, -REPUTATION_RULES.CREATE_POST, 'DELETE_POST', p.id, 'POST');
    }
    await this.prisma.post.deleteMany({ where: { authorId: requesterId } });
    return { success: true };
  }

  async delete(postId: string, requesterId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== requesterId) {
      throw new ForbiddenException('Only the post author can delete it');
    }

    await this.prisma.post.delete({ where: { id: postId } });
    await this.usersService.addReputation(post.authorId, post.categoryId, -REPUTATION_RULES.CREATE_POST, 'DELETE_POST', post.id, 'POST');
    return { success: true };
  }

  async toggleLike(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      await this.prisma.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } });

      // Revoke points
      await this.usersService.addReputation(post.authorId, post.categoryId, -REPUTATION_RULES.RECEIVE_LIKE, 'REVOKE_LIKE', post.id, 'POST');

      return { liked: false };
    }

    await this.prisma.like.create({ data: { userId, postId } });
    await this.prisma.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });

    // Award points
    await this.usersService.addReputation(post.authorId, post.categoryId, REPUTATION_RULES.RECEIVE_LIKE, 'RECEIVE_LIKE', post.id, 'POST');

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

  async findFavorites(userId: string, cursor?: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, post: { isHidden: false } },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
            category: true,
            attachments: true,
            aiAnalysis: true,
            comments: {
              where: { isHidden: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { author: { select: { id: true, name: true, avatarUrl: true } } }
            },
            _count: { select: { comments: true, likes: true } },
            favorites: { where: { userId } },
            likes: { where: { userId } },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return favorites.map(f => {
      const p = f.post;
      const isSaved = p.favorites ? p.favorites.length > 0 : false;
      const isLiked = p.likes ? p.likes.length > 0 : false;
      delete (p as any).favorites;
      delete (p as any).likes;
      return { ...p, isSaved, isLiked };
    });
  }

  async search(query: string, categoryId?: string, requestUserId?: string, cursor?: string) {
    const formattedQuery = query.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean).join(' | ');
    console.log("formattedQuery", formattedQuery)
    console.log("categoryId", categoryId)
    console.log("requestUserId", requestUserId)
    console.log("cursor", cursor)
    const searchCondition = {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
      ]
    };

    console.log("searchCondition", searchCondition.OR[0].title)

    const orderBy: any = formattedQuery ? {
      _relevance: {
        fields: ['title', 'description'],
        search: formattedQuery,
        sort: 'desc'
      }
    } : { createdAt: 'desc' };

    const posts = await this.prisma.post.findMany({
      where: {
        isHidden: false,
        ...(categoryId ? { categoryId } : {}),
        ...searchCondition,
      },
      orderBy,
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
        category: true,
        attachments: true,
        aiAnalysis: true,
        comments: {
          where: { isHidden: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { id: true, name: true, avatarUrl: true } } }
        },
        _count: { select: { comments: true, likes: true } },
        favorites: requestUserId ? { where: { userId: requestUserId } } : false,
        likes: requestUserId ? { where: { userId: requestUserId } } : false,
      },
    });

    return posts.map(p => {
      const isSaved = p.favorites ? p.favorites.length > 0 : false;
      const isLiked = p.likes ? p.likes.length > 0 : false;
      delete (p as any).favorites;
      delete (p as any).likes;
      return { ...p, isSaved, isLiked };
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
