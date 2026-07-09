import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PostsService } from './posts.service';
import { CreatePostDto, PreviewAnalysisDto } from './dto/post.dto';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreatePostDto) {
    return this.postsService.create(user.userId, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findFeed(
    @CurrentUser() user: { userId?: string },
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: 'PROBLEM' | 'SOLUTION',
    @Query('status') status?: 'OPEN' | 'SOLVED' | 'CLOSED',
    @Query('trending') trending?: string,
    @Query('cursor') cursor?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.postsService.findFeed({ categoryId, type, status, trending: trending === 'true', cursor, authorId, requestUserId: user?.userId });
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  findMyPosts(@CurrentUser() user: { userId: string }, @Query('cursor') cursor?: string) {
    return this.postsService.findMyPosts(user.userId, cursor);
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  search(@CurrentUser() user: { userId?: string }, @Query('q') q: string, @Query('categoryId') categoryId?: string) {
    return this.postsService.search(q, categoryId, user?.userId);
  }

  @Post('analyze-preview')
  @UseGuards(JwtAuthGuard)
  previewAnalysis(@Body() dto: PreviewAnalysisDto) {
    return this.postsService.previewAnalysis(dto);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  findFavorites(@CurrentUser() user: { userId: string }, @Query('cursor') cursor?: string) {
    return this.postsService.findFavorites(user.userId, cursor);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@CurrentUser() user: { userId?: string }, @Param('id') id: string) {
    return this.postsService.findOne(id, user?.userId);
  }

  @Patch(':id/solve')
  @UseGuards(JwtAuthGuard)
  markSolved(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { solvedCommentId: string },
  ) {
    return this.postsService.markSolved(id, user.userId, body.solvedCommentId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.postsService.toggleLike(user.userId, id);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  toggleFavorite(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.postsService.toggleFavorite(user.userId, id);
  }

  @Delete('all')
  @UseGuards(JwtAuthGuard)
  deleteAllPosts(@CurrentUser() user: { userId: string }) {
    return this.postsService.deleteAll(user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deletePost(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.postsService.delete(id, user.userId);
  }
}
