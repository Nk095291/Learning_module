import { Injectable, NotFoundException } from '@nestjs/common';
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
    const seat = { id: this.db.nextSeatId(), ...createSeatDto };
    this.db.seats.push(seat);
    return seat;
  }

  findAll() {
    return this.db.seats;
  }

  findOne(id: number) {
    const seat = this.db.seats.find((s) => s.id === id);
    if (!seat) throw new NotFoundException(`Seat ${id} not found`);
    return seat;
  }

  update(id: number, updateSeatDto: UpdateSeatDto) {
    const seat = this.findOne(id);
    if (updateSeatDto.theaterId) {
      this.theatersService.findOne(updateSeatDto.theaterId);
    }
    Object.assign(seat, updateSeatDto);
    return seat;
  }

  remove(id: number) {
    const index = this.db.seats.findIndex((s) => s.id === id);
    if (index === -1) throw new NotFoundException(`Seat ${id} not found`);
    this.db.seats.splice(index, 1);
    return { message: `Seat ${id} deleted successfully` };
  }
}
