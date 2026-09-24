import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { Database } from '../database/database.service.js';
import { UsersService } from '../users/users.service.js';
import { MovieShowingsService } from '../movies/movie-showings.service.js';
import { BookedSeatsService } from './booked-seats.service.js';
import { CreateBookedSeatDto } from './dto/create-booked-seat.dto.js';

@Injectable()
export class BookingsService {
  constructor(
    private db: Database,
    private usersService: UsersService,
    private movieShowingsService: MovieShowingsService,
    private bookedSeatsService: BookedSeatsService,
  ) {}

  create(createBookingDto: CreateBookingDto) {
    const user = this.usersService.findOne(createBookingDto.userId);
    const showing = this.movieShowingsService.findOne(
      createBookingDto.movieShowingId,
    );
    const seats = createBookingDto.bookedSeats.map((bookedSeat) => bookedSeat.seatId);

    if (!this.bookedSeatsService.areSeatsAvailable(seats, showing.id)) {
      throw new BadRequestException('Selected seats are not available');
    }

    this.assertAgeRating(createBookingDto.bookedSeats, showing.movie.ageRating);

    const booking = {
      id: this.db.nextBookingId(),
      ...createBookingDto,
      created_at: new Date(),
    };
    this.db.bookings[booking.id] = booking;

    for (const bookedSeat of createBookingDto.bookedSeats) {
      this.bookedSeatsService.create(bookedSeat, booking.id, showing.id);
    }
    return {
      ...booking,
      bookedSeats: this.bookedSeatsService.findAllByBookingId(booking.id),
      user : user, 
      movieShowing : showing,
    };
  }

  findAll() {
    return Object.values(this.db.bookings).map((booking) => ({
      ...booking,
      bookedSeats: this.bookedSeatsService.findAllByBookingId(booking.id),
      user : this.usersService.findOne(booking.userId),
      movieShowing : this.movieShowingsService.findOne(booking.movieShowingId),
    }));
  }

  findOne(id: number) {
    const booking = this.db.bookings[id];
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return {
      ...booking,
      bookedSeats: this.bookedSeatsService.findAllByBookingId(booking.id),
      user : this.usersService.findOne(booking.userId),
      movieShowing : this.movieShowingsService.findOne(booking.movieShowingId),
    };
  }

  private assertAgeRating(bookedSeats: CreateBookedSeatDto[], ageRating: number) {
    for (const bookedSeat of bookedSeats) {
      const dob = bookedSeat.userId
        ? this.usersService.getDob(bookedSeat.userId)
        : bookedSeat.userDOB;
      if (!dob) {
        throw new BadRequestException('Providing DOB is mandatory for booking');
      }
      const age = Math.floor(
        (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );
      if (age < ageRating) {
        throw new BadRequestException(
          `User must be at least ${ageRating} to book this movie`,
        );
      }
    }
  }
}
