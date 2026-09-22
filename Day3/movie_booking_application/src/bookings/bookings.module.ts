import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { SeatGroupsService } from './seat-groups.service.js';
import { BookedSeatsService } from './booked-seats.service.js';
import { BookingsController } from './bookings.controller.js';
import { SeatGroupsController } from './seat-groups.controller.js';
import { BookedSeatsController } from './booked-seats.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { UsersModule } from '../users/users.module.js';
import { TheatersModule } from '../theaters/theaters.module.js';
import { MoviesModule } from '../movies/movies.module.js';

@Module({
  controllers: [
    BookingsController,
    SeatGroupsController,
    BookedSeatsController,
  ],
  providers: [BookingsService, SeatGroupsService, BookedSeatsService],
  imports: [DatabaseModule, UsersModule, TheatersModule, MoviesModule],
})
export class BookingsModule {}
