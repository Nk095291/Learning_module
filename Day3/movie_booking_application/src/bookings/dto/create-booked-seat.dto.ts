import { BookedSeatStatus } from '../entities/booked-seat.entity.js';

export class CreateBookedSeatDto {
  seatId: number;
  seatGroupId: number;
  status?: BookedSeatStatus;
}
