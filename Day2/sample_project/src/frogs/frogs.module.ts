import { Module } from '@nestjs/common';
import { FrogsService } from './frogs.service.js';
import { FrogsController } from './frogs.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  controllers: [FrogsController],
  providers: [FrogsService],
  imports: [DatabaseModule],
})
export class FrogsModule {}
