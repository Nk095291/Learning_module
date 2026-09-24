import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity.js';
import { Theater } from '../theaters/entities/theater.entity.js';
import { Seat } from '../theaters/entities/seat.entity.js';
import { Movie } from '../movies/entities/movie.entity.js';
import { MovieShowing } from '../movies/entities/movie-showing.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookedSeat } from '../bookings/entities/booked-seat.entity.js';

@Injectable()
export class Database {
  users: Record<number, User> = {
    1: {
      id: 1,
      email: 'john@example.com',
      dob: '1990-05-12',
      created_at: new Date('2026-01-01'),
    },
    2: {
      id: 2,
      email: 'jane@example.com',
      dob: '1990-05-12',
      created_at: new Date('2026-01-01'),
    },
  };
  theaters: Record<number, Theater> = {
    1: {
      id: 1,
      name: 'PVR Phoenix',
      locality: 'Lower Parel',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    2: {
      id: 2,
      name: 'PVR Phoenix',
      locality: 'Lower Parel',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
  };
  seats: Record<number, Seat> = {
    1: { id: 1, theaterId: 1, seatNumber: 'A1', row: 'A', col: 1 },
    2: { id: 2, theaterId: 1, seatNumber: 'A2', row: 'A', col: 2 },
    3: { id: 3, theaterId: 1, seatNumber: 'B1', row: 'B', col: 1 },
  };
  movies: Record<number, Movie> = {
    1: { id: 1, title: 'Inception', ageRating: 13, created_at: new Date('2026-01-01') },
  };
  movieShowings: Record<number, MovieShowing> = {
    1: { id: 1, movieId: 1, theaterId: 1, startTime: '18:00', endTime: '21:00', showDate: '2026-09-22', created_at: new Date('2026-01-01') },
  };
  bookings: Record<number, Booking> = {};
  bookedSeats: Record<number, BookedSeat> = {};

  private userId = 2;
  private theaterId = 2;
  private seatId = 4;
  private movieId = 2;
  private movieShowingId = 2;
  private bookingId = 1;
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

  nextBookedSeatId() {
    return this.bookedSeatId++;
  }

  removeSeatsByTheaterId(theaterId: number) {
    Object.values(this.seats).forEach((seat) => {
      if (seat.theaterId === theaterId) {
        delete this.seats[seat.id];
      }
    });
  }

  removeMovieShowingsByMovieId(movieId: number) {
    Object.values(this.movieShowings).forEach((movieShowing) => {
      if (movieShowing.movieId === movieId) {
        delete this.movieShowings[movieShowing.id];
      }
    });
  }

  getAvailableSeats(movieShowingId: number) {
    const movieShowing = this.movieShowings[movieShowingId];
    const availableSeats = Object.values(this.seats).filter((seat) => {
      return seat.theaterId === movieShowing.theaterId && !this.bookedSeats[seat.id];
    });
    return availableSeats;
  }
}
