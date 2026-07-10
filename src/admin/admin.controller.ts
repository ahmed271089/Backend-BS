import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Patch('posts/:id/visibility')
  updatePostVisibility(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() body: { isHidden: boolean }) {
    return this.adminService.updatePostVisibility(id, body.isHidden, user.userId);
  }

  @Delete('posts/:id')
  deletePost(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.adminService.deletePost(id, user.userId);
  }

  @Patch('comments/:id/visibility')
  updateCommentVisibility(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() body: { isHidden: boolean }) {
    return this.adminService.updateCommentVisibility(id, body.isHidden, user.userId);
  }

  @Delete('comments/:id')
  deleteComment(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.adminService.deleteComment(id, user.userId);
  }

  // --- USER MANAGEMENT ENDPOINTS ---

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getUsers(pageNum, limitNum, search);
  }

  @Patch('users/:id/role')
  updateUserRole(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() body: { role: 'USER' | 'ADMIN' }) {
    return this.adminService.updateUserRole(id, body.role, user.userId);
  }

  @Patch('users/:id/status')
  updateUserStatus(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' }) {
    return this.adminService.updateUserStatus(id, body.status, user.userId);
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.adminService.deleteUser(id, user.userId);
  }

  // --- CATEGORY MANAGEMENT ENDPOINTS ---

  @Post('categories')
  createCategory(@Body() body: CreateCategoryDto) {
    return this.adminService.createCategory(body.name, body.slug, body.icon);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, body.name, body.slug, body.icon);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }
}
