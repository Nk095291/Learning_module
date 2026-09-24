import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookedSeatsService } from './booked-seats.service.js';
import { BookingsController } from './bookings.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { UsersModule } from '../users/users.module.js';
import { TheatersModule } from '../theaters/theaters.module.js';
import { MoviesModule } from '../movies/movies.module.js';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService , BookedSeatsService],
  imports: [DatabaseModule, UsersModule, TheatersModule, MoviesModule],
})
export class BookingsModule {}
