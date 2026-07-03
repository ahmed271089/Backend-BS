import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
  findFeed(
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: 'PROBLEM' | 'SOLUTION',
    @Query('status') status?: 'OPEN' | 'SOLVED' | 'CLOSED',
    @Query('trending') trending?: string,
    @Query('cursor') cursor?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.postsService.findFeed({ categoryId, type, status, trending: trending === 'true', cursor, authorId });
  }

  @Get('search')
  search(@Query('q') q: string, @Query('categoryId') categoryId?: string) {
    return this.postsService.search(q, categoryId);
  }

  @Post('analyze-preview')
  @UseGuards(JwtAuthGuard)
  previewAnalysis(@Body() dto: PreviewAnalysisDto) {
    return this.postsService.previewAnalysis(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deletePost(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.postsService.delete(id, user.userId);
  }
}
