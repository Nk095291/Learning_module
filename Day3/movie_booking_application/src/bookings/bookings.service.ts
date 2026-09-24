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
import { ageOn } from './calendar-age.js';

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
    const seatIds = this.assertSeatSelectionValid(
      createBookingDto.bookedSeats,
      showing.theaterId,
    );
    this.assertSeatsAvailable(seatIds, showing.id);
    this.assertAgeEligible(createBookingDto.bookedSeats, showing.movie.ageRating);

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

  private assertSeatSelectionValid(
    bookedSeats: CreateBookedSeatDto[] | undefined,
    theaterId: number,
  ): number[] {
    if (!bookedSeats || bookedSeats.length === 0) {
      throw new BadRequestException('At least one seat must be selected');
    }
    const seatIds = bookedSeats.map((bookedSeat) => bookedSeat.seatId);
    if (new Set(seatIds).size !== seatIds.length) {
      throw new BadRequestException('Each seat can only be selected once');
    }
    for (const seatId of seatIds) {
      const seat = this.db.seats[seatId];
      if (!seat) {
        throw new BadRequestException(`Seat ${seatId} does not exist`);
      }
      if (seat.theaterId !== theaterId) {
        throw new BadRequestException(
          `Seat ${seatId} is not in the theater of this showing`,
        );
      }
    }
    return seatIds;
  }

  private assertSeatsAvailable(seatIds: number[], movieShowingId: number) {
    if (!this.bookedSeatsService.areSeatsAvailable(seatIds, movieShowingId)) {
      throw new BadRequestException('Selected seats are not available');
    }
  }

  private assertAgeEligible(
    bookedSeats: CreateBookedSeatDto[],
    ageRating: number,
  ) {
    for (const bookedSeat of bookedSeats) {
      const dob = this.resolveDateOfBirth(bookedSeat);
      const dateOfBirth = new Date(dob);
      if (isNaN(dateOfBirth.getTime())) {
        throw new BadRequestException('Invalid date of birth');
      }
      if (ageOn(dateOfBirth, new Date()) < ageRating) {
        throw new BadRequestException(
          `User must be at least ${ageRating} to book this movie`,
        );
      }
    }
  }

  private resolveDateOfBirth(bookedSeat: CreateBookedSeatDto): string {
    const dob =
      bookedSeat.userId !== undefined
        ? this.usersService.findOne(bookedSeat.userId).dob
        : bookedSeat.userDOB;
    if (!dob) {
      throw new BadRequestException('Providing DOB is mandatory for booking');
    }
    return dob;
  }
}
