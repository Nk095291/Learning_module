import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSeatDto } from './dto/create-seat.dto.js';
import { UpdateSeatDto } from './dto/update-seat.dto.js';
import { Database } from '../database/database.service.js';
import { TheatersService } from './theaters.service.js';

@Injectable()
export class SeatsService {
  constructor(
    private db: Database,
    private theatersService: TheatersService,
  ) {}

  create(createSeatDto: CreateSeatDto) {
    this.theatersService.findOne(createSeatDto.theaterId);
    const seat = { ...createSeatDto, id: this.db.nextSeatId() };
    this.db.seats[seat.id] = seat;
    return seat;
  }

  findAll() {
    return Object.values(this.db.seats).map((seat) => ({
      ...seat,
      theater: this.theatersService.findOne(seat.theaterId),
    }));
  }

  findOne(id: number) {
    const seat = this.getStoredSeat(id);
    return {
      ...seat,
      theater: this.theatersService.findOne(seat.theaterId),
    };
  }

  update(id: number, updateSeatDto: UpdateSeatDto) {
    const seat = this.getStoredSeat(id);
    if (updateSeatDto.theaterId && updateSeatDto.theaterId !== seat.theaterId) {
      throw new BadRequestException('Seat theater id cannot be changed');
    }
    Object.assign(seat, updateSeatDto);
    return seat;
  }

  remove(id: number) {
    const seat = this.getStoredSeat(id);
    delete this.db.seats[id];
    return { message: `Seat ${seat.seatNumber} (${id}) deleted successfully` };
  }

  private getStoredSeat(id: number) {
    const seat = this.db.seats[id];
    if (!seat) throw new NotFoundException(`Seat ${id} not found`);
    return seat;
  }
}
