import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, ValidateNested } from 'class-validator';
import { CreateBookedSeatDto } from './create-booked-seat.dto.js';

export class CreateBookingDto {
  @IsInt()
  userId: number;

  @IsInt()
  movieShowingId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateBookedSeatDto)
  bookedSeats: CreateBookedSeatDto[];
}
