import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

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
}
