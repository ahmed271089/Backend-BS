import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RewardsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Called after a post is marked SOLVED. The original poster rewards the
   * comment author whose solution helped, which both grants points and
   * bumps that user's reputation in the post's category.
   */
  async give(fromUserId: string, postId: string, commentId: string, points: number) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== fromUserId) {
      throw new ForbiddenException('Only the post author can reward a contributor');
    }

    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.postId !== postId) {
      throw new BadRequestException('Comment does not belong to this post');
    }
    if (comment.authorId === fromUserId) {
      throw new BadRequestException('You cannot reward your own comment');
    }

    const existingReward = await this.prisma.reward.findFirst({
      where: { postId, toUserId: comment.authorId },
    });
    if (existingReward) {
      throw new BadRequestException('This contributor has already been rewarded on this post');
    }

    const reward = await this.prisma.reward.create({
      data: { fromUserId, toUserId: comment.authorId, postId, points },
    });

    await this.usersService.addReputation(comment.authorId, post.categoryId, points);

    await this.notificationsService.create(comment.authorId, 'REWARD', {
      postId,
      postTitle: post.title,
      commentId,
      points,
      fromUserId,
    });

    return reward;
  }

  async findForUser(userId: string) {
    return this.prisma.reward.findMany({
      where: { toUserId: userId },
      include: { post: true, fromUser: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
