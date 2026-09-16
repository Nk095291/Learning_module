import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { BlogsModule } from './blogs/blogs.module.js';

@Module({
  imports: [UsersModule, BlogsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
