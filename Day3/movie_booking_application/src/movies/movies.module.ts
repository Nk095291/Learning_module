import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service.js';
import { MovieShowingsService } from './movie-showings.service.js';
import { MoviesController } from './movies.controller.js';
import { MovieShowingsController } from './movie-showings.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { TheatersModule } from '../theaters/theaters.module.js';

@Module({
  controllers: [MoviesController, MovieShowingsController],
  providers: [MoviesService, MovieShowingsService],
  imports: [DatabaseModule, TheatersModule],
  exports: [MoviesService, MovieShowingsService],
})
export class MoviesModule {}
