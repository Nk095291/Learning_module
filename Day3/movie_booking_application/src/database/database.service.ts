import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity.js';
import { Theater } from '../theaters/entities/theater.entity.js';
import { Seat } from '../theaters/entities/seat.entity.js';
import { Movie } from '../movies/entities/movie.entity.js';
import { MovieShowing } from '../movies/entities/movie-showing.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { SeatGroup } from '../bookings/entities/seat-group.entity.js';
import { BookedSeat } from '../bookings/entities/booked-seat.entity.js';

@Injectable()
export class Database {
  users: User[] = [
    {
      id: 1,
      email: 'john@example.com',
      dob: '1990-05-12',
      created_at: new Date('2026-01-01'),
    },
  ];
  theaters: Theater[] = [
    {
      id: 1,
      name: 'PVR Phoenix',
      locality: 'Lower Parel',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
  ];
  seats: Seat[] = [
    { id: 1, theaterId: 1, seatNumber: 'A1', row: 'A', col: 1 },
    { id: 2, theaterId: 1, seatNumber: 'A2', row: 'A', col: 2 },
    { id: 3, theaterId: 1, seatNumber: 'B1', row: 'B', col: 1 },
  ];
  movies: Movie[] = [
    {
      id: 1,
      title: 'Inception',
      ageRating: 13,
      created_at: new Date('2026-01-01'),
    },
  ];
  movieShowings: MovieShowing[] = [
    {
      id: 1,
      movieId: 1,
      theaterId: 1,
      startTime: '18:00',
      endTime: '21:00',
      showDate: '2026-09-22',
      created_at: new Date('2026-01-01'),
    },
  ];
  bookings: Booking[] = [];
  seatGroups: SeatGroup[] = [];
  bookedSeats: BookedSeat[] = [];

  private userId = 2;
  private theaterId = 2;
  private seatId = 4;
  private movieId = 2;
  private movieShowingId = 2;
  private bookingId = 1;
  private seatGroupId = 1;
  private bookedSeatId = 1;

  nextUserId() {
    return this.userId++;
  }

  nextTheaterId() {
    return this.theaterId++;
  }

  nextSeatId() {
    return this.seatId++;
  }

  nextMovieId() {
    return this.movieId++;
  }

  nextMovieShowingId() {
    return this.movieShowingId++;
  }

  nextBookingId() {
    return this.bookingId++;
  }

  nextSeatGroupId() {
    return this.seatGroupId++;
  }

  nextBookedSeatId() {
    return this.bookedSeatId++;
  }
}
