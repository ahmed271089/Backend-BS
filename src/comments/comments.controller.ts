import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from '../posts/dto/post.dto';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findByPost(@CurrentUser() user: { userId?: string }, @Param('postId') postId: string, @Query('cursor') cursor?: string) {
    return this.commentsService.findByPost(postId, cursor, user?.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: { userId: string },
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(postId, user.userId, dto.content, dto.parentId);
  }

  @Post(':commentId/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(@CurrentUser() user: { userId: string }, @Param('commentId') commentId: string) {
    return this.commentsService.toggleLike(user.userId, commentId);
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: { userId: string },
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(commentId, user.userId, dto.content);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  delete(@CurrentUser() user: { userId: string; role: string }, @Param('commentId') commentId: string) {
    return this.commentsService.delete(commentId, user.userId, user.role);
  }
}
