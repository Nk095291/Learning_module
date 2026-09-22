import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookedSeatDto } from './dto/create-booked-seat.dto.js';
import { UpdateBookedSeatDto } from './dto/update-booked-seat.dto.js';
import { Database } from '../database/database.service.js';
import { SeatGroupsService } from './seat-groups.service.js';
import { SeatsService } from '../theaters/seats.service.js';
import { BookingsService } from './bookings.service.js';
import { BookedSeatStatus } from './entities/booked-seat.entity.js';

@Injectable()
export class BookedSeatsService {
  constructor(
    private db: Database,
    private seatGroupsService: SeatGroupsService,
    private seatsService: SeatsService,
    private bookingsService: BookingsService,
  ) {}

  create(createBookedSeatDto: CreateBookedSeatDto) {
    this.seatsService.findOne(createBookedSeatDto.seatId);
    const seatGroup = this.seatGroupsService.findOne(
      createBookedSeatDto.seatGroupId,
    );
    const booking = this.bookingsService.findOne(seatGroup.bookingId);

    this.assertNotDoubleBooked(createBookedSeatDto.seatId, booking.movieShowingId);

    const bookedSeat = {
      id: this.db.nextBookedSeatId(),
      ...createBookedSeatDto,
      status: createBookedSeatDto.status ?? BookedSeatStatus.RESERVED,
      created_at: new Date(),
    };
    this.db.bookedSeats.push(bookedSeat);
    return bookedSeat;
  }

  findAll() {
    return this.db.bookedSeats;
  }

  findOne(id: number) {
    const bookedSeat = this.db.bookedSeats.find((s) => s.id === id);
    if (!bookedSeat) throw new NotFoundException(`Booked seat ${id} not found`);
    return bookedSeat;
  }

  update(id: number, updateBookedSeatDto: UpdateBookedSeatDto) {
    const bookedSeat = this.findOne(id);
    if (updateBookedSeatDto.seatId) {
      this.seatsService.findOne(updateBookedSeatDto.seatId);
    }
    if (updateBookedSeatDto.seatGroupId) {
      this.seatGroupsService.findOne(updateBookedSeatDto.seatGroupId);
    }
    Object.assign(bookedSeat, updateBookedSeatDto);
    return bookedSeat;
  }

  remove(id: number) {
    const index = this.db.bookedSeats.findIndex((s) => s.id === id);
    if (index === -1)
      throw new NotFoundException(`Booked seat ${id} not found`);
    this.db.bookedSeats.splice(index, 1);
    return { message: `Booked seat ${id} deleted successfully` };
  }

  private assertNotDoubleBooked(seatId: number, movieShowingId: number) {
    const alreadyReserved = this.db.bookedSeats.some((bookedSeat) => {
      if (
        bookedSeat.seatId !== seatId ||
        bookedSeat.status !== BookedSeatStatus.RESERVED
      ) {
        return false;
      }
      const group = this.db.seatGroups.find(
        (g) => g.id === bookedSeat.seatGroupId,
      );
      if (!group) return false;
      const booking = this.db.bookings.find((b) => b.id === group.bookingId);
      return booking?.movieShowingId === movieShowingId;
    });

    if (alreadyReserved) {
      throw new BadRequestException(
        `Seat ${seatId} is already reserved for this showing`,
      );
    }
  }
}
