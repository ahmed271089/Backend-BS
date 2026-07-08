import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController, AdminReportsController } from './reports.controller';
import { AgentClientModule } from '../agent-client/agent-client.module';

@Module({
  imports: [AgentClientModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
