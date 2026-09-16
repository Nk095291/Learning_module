import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports : [DatabaseModule],
  exports : [UsersService],
})
export class UsersModule {}
