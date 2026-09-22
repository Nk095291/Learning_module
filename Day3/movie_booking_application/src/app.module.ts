import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './users/users.module.js';
import { TheatersModule } from './theaters/theaters.module.js';
import { MoviesModule } from './movies/movies.module.js';
import { BookingsModule } from './bookings/bookings.module.js';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    TheatersModule,
    MoviesModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
