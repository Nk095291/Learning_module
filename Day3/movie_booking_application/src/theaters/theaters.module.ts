import { Module } from '@nestjs/common';
import { TheatersService } from './theaters.service.js';
import { SeatsService } from './seats.service.js';
import { TheatersController } from './theaters.controller.js';
import { SeatsController } from './seats.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  controllers: [TheatersController, SeatsController],
  providers: [TheatersService, SeatsService],
  imports: [DatabaseModule],
  exports: [TheatersService, SeatsService],
})
export class TheatersModule {}
