import { Module } from '@nestjs/common';
import { BlogsService } from './blogs.service.js';
import { BlogsController } from './blogs.controller.js';
import { UsersModule } from '../users/users.module.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  controllers: [BlogsController],
  providers: [BlogsService],
  imports : [UsersModule, DatabaseModule],
})
export class BlogsModule {}
