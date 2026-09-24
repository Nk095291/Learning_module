import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTheaterDto } from './dto/create-theater.dto.js';
import { UpdateTheaterDto } from './dto/update-theater.dto.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class TheatersService {
  constructor(private db: Database) {}

  create(createTheaterDto: CreateTheaterDto) {
    const theater = { id: this.db.nextTheaterId(), ...createTheaterDto };
    this.db.theaters[theater.id] = theater;
    return theater;
  }

  findAll() {
    return Object.values(this.db.theaters);
  }

  findOne(id: number) {
    const theater = this.db.theaters[id];
    if (!theater) throw new NotFoundException(`Theater ${id} not found`);
    return theater;
  }

  update(id: number, updateTheaterDto: UpdateTheaterDto) {
    const theater = this.findOne(id);
    Object.assign(theater, updateTheaterDto);
    this.db.theaters[id] = theater;
    return theater;
  }

  remove(id: number) {
    const theater = this.findOne(id);
    delete this.db.theaters[id];
    this.db.removeSeatsByTheaterId(id);
    return { message: `Theater ${theater.name} (${id}) deleted successfully` };
  }
}
