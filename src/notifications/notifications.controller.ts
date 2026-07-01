import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.notificationsService.listForUser(user.userId);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { userId: string }) {
    return this.notificationsService.getUnreadCount(user.userId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: { userId: string }) {
    return this.notificationsService.markAllRead(user.userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.notificationsService.markRead(id, user.userId);
  }
}
