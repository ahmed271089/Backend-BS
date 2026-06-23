import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { RewardsModule } from './rewards/rewards.module';
import { AgentClientModule } from './agent-client/agent-client.module';

// Not yet implemented — built in the next steps:
// import { ChatModule } from './chat/chat.module';
// import { NotificationsModule } from './notifications/notifications.module';
// import { ReportsModule } from './reports/reports.module';
// import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    AgentClientModule,
    PostsModule,
    CommentsModule,
    RewardsModule,
  ],
})
export class AppModule {}
