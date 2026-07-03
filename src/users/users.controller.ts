import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: { userId: string }) {
    return this.usersService.findById(user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listUsers(@Query('q') q?: string) {
    return this.usersService.listUsers(q);
  }

  @Get('leaderboard')
  getLeaderboard(@Query('categoryId') categoryId?: string) {
    return this.usersService.getLeaderboard(categoryId);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.usersService.search(q ?? '');
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: { userId: string },
    @Body() body: { name?: string; bio?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(user.userId, body);
  }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  suspend(@Param('id') id: string) {
    return this.usersService.suspend(id);
  }

  @Patch(':id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  ban(@Param('id') id: string) {
    return this.usersService.ban(id);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  verify(@Param('id') id: string) {
    return this.usersService.verify(id);
  }

  @Patch(':id/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  reactivate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }
}
