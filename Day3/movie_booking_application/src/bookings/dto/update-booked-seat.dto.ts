import { PartialType } from '@nestjs/mapped-types';
import { CreateBookedSeatDto } from './create-booked-seat.dto.js';

export class UpdateBookedSeatDto extends PartialType(CreateBookedSeatDto) {}
