import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/post.dto';

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
    @Query('trending') trending?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.findFeed({ categoryId, type, trending: trending === 'true', cursor });
  }

  @Get('search')
  search(@Query('q') q: string, @Query('categoryId') categoryId?: string) {
    return this.postsService.search(q, categoryId);
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
}
