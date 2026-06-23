import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RewardsService } from './rewards.service';

@Controller()
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Post('posts/:postId/reward')
  @UseGuards(JwtAuthGuard)
  give(
    @CurrentUser() user: { userId: string },
    @Param('postId') postId: string,
    @Body() body: { commentId: string; points: number },
  ) {
    return this.rewardsService.give(user.userId, postId, body.commentId, body.points);
  }

  @Get('users/:userId/rewards')
  findForUser(@Param('userId') userId: string) {
    return this.rewardsService.findForUser(userId);
  }
}
