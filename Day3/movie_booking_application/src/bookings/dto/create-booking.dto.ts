import {CreateBookedSeatDto} from './create-booked-seat.dto.js';

export class CreateBookingDto {
  userId: number;
  movieShowingId: number;
  bookedSeats: CreateBookedSeatDto[];
}
