import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSeatGroupDto } from './dto/create-seat-group.dto.js';
import { UpdateSeatGroupDto } from './dto/update-seat-group.dto.js';
import { Database } from '../database/database.service.js';
import { BookingsService } from './bookings.service.js';

@Injectable()
export class SeatGroupsService {
  constructor(
    private db: Database,
    private bookingsService: BookingsService,
  ) {}

  create(createSeatGroupDto: CreateSeatGroupDto) {
    this.bookingsService.findOne(createSeatGroupDto.bookingId);
    const seatGroup = { id: this.db.nextSeatGroupId(), ...createSeatGroupDto };
    this.db.seatGroups.push(seatGroup);
    return seatGroup;
  }

  findAll() {
    return this.db.seatGroups;
  }

  findOne(id: number) {
    const seatGroup = this.db.seatGroups.find((g) => g.id === id);
    if (!seatGroup) throw new NotFoundException(`Seat group ${id} not found`);
    return seatGroup;
  }

  update(id: number, updateSeatGroupDto: UpdateSeatGroupDto) {
    const seatGroup = this.findOne(id);
    if (updateSeatGroupDto.bookingId) {
      this.bookingsService.findOne(updateSeatGroupDto.bookingId);
    }
    Object.assign(seatGroup, updateSeatGroupDto);
    return seatGroup;
  }

  remove(id: number) {
    const index = this.db.seatGroups.findIndex((g) => g.id === id);
    if (index === -1) throw new NotFoundException(`Seat group ${id} not found`);
    this.db.seatGroups.splice(index, 1);
    return { message: `Seat group ${id} deleted successfully` };
  }
}
