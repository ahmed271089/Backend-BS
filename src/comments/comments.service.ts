import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { REPUTATION_RULES } from '../common/constants/reputation.constants';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}

  async create(postId: string, authorId: string, content: string, parentId?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.comment.create({
      data: { postId, authorId, content, parentId },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.prisma.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });

    if (post.authorId !== authorId) {
      this.notificationsService.create(post.authorId, 'COMMENT', {
        postId,
        postTitle: post.title,
        commentId: comment.id,
        authorId,
      }).catch(err => console.error('Notification error', err));
    }

    if (parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
      if (parent && parent.authorId !== authorId && parent.authorId !== post.authorId) {
        this.notificationsService.create(parent.authorId, 'COMMENT', {
          postId,
          postTitle: post.title,
          commentId: comment.id,
          authorId,
          isReply: true,
        }).catch(err => console.error('Notification error', err));
      }
    }

    await this.usersService.addReputation(authorId, post.categoryId, REPUTATION_RULES.CREATE_COMMENT, 'CREATE_COMMENT', comment.id, 'COMMENT');

    return comment;
  }

  async findByPost(postId: string, cursor?: string, requestUserId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, isHidden: false },
      orderBy: { createdAt: 'asc' },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { 
        author: { select: { id: true, name: true, avatarUrl: true } },
        likes: requestUserId ? { where: { userId: requestUserId } } : false,
      },
    });

    return comments.map(c => {
      const userVote = c.likes && c.likes.length > 0 ? c.likes[0].value : 0;
      delete (c as any).likes;
      return { ...c, userVote };
    });
  }

  async vote(userId: string, commentId: string, value: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.prisma.like.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      if (existing.value === value) {
        // Remove vote
        await this.prisma.like.delete({ where: { id: existing.id } });
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { likesCount: { decrement: value } }
        });
        
        const repRule = value === 1 ? REPUTATION_RULES.RECEIVE_LIKE : -REPUTATION_RULES.RECEIVE_LIKE; // assuming downvote deducts same amount
        await this.usersService.addReputation(comment.authorId, comment.post.categoryId, -repRule, 'REVOKE_VOTE', comment.id, 'COMMENT');

        return { userVote: 0 };
      } else {
        // Change vote
        await this.prisma.like.update({
          where: { id: existing.id },
          data: { value }
        });
        const difference = value - existing.value; // e.g., 1 - (-1) = 2, or -1 - 1 = -2
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { likesCount: { increment: difference } }
        });
        
        const repRuleOld = existing.value === 1 ? REPUTATION_RULES.RECEIVE_LIKE : -REPUTATION_RULES.RECEIVE_LIKE;
        const repRuleNew = value === 1 ? REPUTATION_RULES.RECEIVE_LIKE : -REPUTATION_RULES.RECEIVE_LIKE;
        await this.usersService.addReputation(comment.authorId, comment.post.categoryId, repRuleNew - repRuleOld, 'CHANGE_VOTE', comment.id, 'COMMENT');

        return { userVote: value };
      }
    }

    // New vote
    await this.prisma.like.create({ data: { userId, commentId, value } });
    await this.prisma.comment.update({ where: { id: commentId }, data: { likesCount: { increment: value } } });
    
    const repRule = value === 1 ? REPUTATION_RULES.RECEIVE_LIKE : -REPUTATION_RULES.RECEIVE_LIKE;
    await this.usersService.addReputation(comment.authorId, comment.post.categoryId, repRule, 'RECEIVE_VOTE', comment.id, 'COMMENT');

    return { userVote: value };
  }

  async delete(commentId: string, requesterId: string, requesterRole: string) {
    const comment = await this.prisma.comment.findUnique({ 
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== requesterId && requesterRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });

    // Keep solution status in sync with accepted comments
    if (comment.post.solvedCommentId === commentId) {
      await this.prisma.post.update({
        where: { id: comment.postId },
        data: { 
          commentsCount: { decrement: 1 },
          status: 'OPEN',
          solvedCommentId: null
        }
      });
    } else {
      await this.prisma.post.update({ 
        where: { id: comment.postId }, 
        data: { commentsCount: { decrement: 1 } } 
      });
    }
    
    // Revoke points
    await this.usersService.addReputation(comment.authorId, comment.post.categoryId, -REPUTATION_RULES.CREATE_COMMENT, 'DELETE_COMMENT', comment.id, 'COMMENT');
  }

  async update(commentId: string, requesterId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== requesterId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
    });
  }
}
