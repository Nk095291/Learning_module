import {
  Injectable,
} from '@nestjs/common';
import { CreateBookedSeatDto } from './dto/create-booked-seat.dto.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class BookedSeatsService {
  constructor(
    private db: Database,
  ) {}

  create(createBookedSeatDto: CreateBookedSeatDto, bookingId: number, movieShowingId: number) {
    const bookedSeat = {
      id: this.db.nextBookedSeatId(),
      ...createBookedSeatDto,
      created_at: new Date(),
      bookingId: bookingId,
      movieShowingId: movieShowingId,
    };
    this.db.bookedSeats[bookedSeat.id] = bookedSeat;
    return bookedSeat;
  }

  findAllByBookingId(bookingId: number) {
    return Object.values(this.db.bookedSeats).filter((bookedSeat) => bookedSeat.bookingId === bookingId);
  }

  findAllByMovieShowingId(movieShowingId: number) {
    return Object.values(this.db.bookedSeats).filter((bookedSeat) => bookedSeat.movieShowingId === movieShowingId);
  }

  areSeatsAvailable(seatIds: number[], movieShowingId: number) {
    return seatIds.every((seatId) => !this.db.isSeatBookedForShowing(seatId, movieShowingId));
  }
}
