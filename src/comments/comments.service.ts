import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(postId: string, authorId: string, content: string, parentId?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.comment.create({
      data: { postId, authorId, content, parentId },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await this.prisma.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });

    // TODO: emit notification to post.authorId (and parent comment author if a reply)
    return comment;
  }

  async findByPost(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async toggleLike(userId: string, commentId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      await this.prisma.comment.update({ where: { id: commentId }, data: { likesCount: { decrement: 1 } } });
      return { liked: false };
    }

    await this.prisma.like.create({ data: { userId, commentId } });
    await this.prisma.comment.update({ where: { id: commentId }, data: { likesCount: { increment: 1 } } });
    return { liked: true };
  }

  async delete(commentId: string, requesterId: string, requesterRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== requesterId && requesterRole !== 'ADMIN') {
      throw new NotFoundException('Comment not found');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    await this.prisma.post.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } });
  }
}
