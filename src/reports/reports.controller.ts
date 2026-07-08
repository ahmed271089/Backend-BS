import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() body: { targetType: 'POST' | 'COMMENT' | 'MESSAGE' | 'USER'; targetId: string; reason: string; details?: string },
  ) {
    return this.reportsService.create(user.userId, body.targetType, body.targetId, body.reason, body.details);
  }
}

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  listPending() {
    return this.reportsService.listPending();
  }

  @Get('history')
  listHistory() {
    return this.reportsService.listHistory();
  }

  @Get(':id')
  getReportDetails(@Param('id') id: string) {
    return this.reportsService.getReportDetails(id);
  }

  @Patch(':id')
  updateStatus(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() body: { status: 'DISMISSED' | 'ACTION_TAKEN' }) {
    return this.reportsService.updateStatus(id, body.status, user.userId);
  }
}
