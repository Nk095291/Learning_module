import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTheaterDto } from './dto/create-theater.dto.js';
import { UpdateTheaterDto } from './dto/update-theater.dto.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class TheatersService {
  constructor(private db: Database) {}

  create(createTheaterDto: CreateTheaterDto) {
    const theater = { id: this.db.nextTheaterId(), ...createTheaterDto };
    this.db.theaters.push(theater);
    return theater;
  }

  findAll() {
    return this.db.theaters;
  }

  findOne(id: number) {
    const theater = this.db.theaters.find((t) => t.id === id);
    if (!theater) throw new NotFoundException(`Theater ${id} not found`);
    return theater;
  }

  update(id: number, updateTheaterDto: UpdateTheaterDto) {
    const theater = this.findOne(id);
    Object.assign(theater, updateTheaterDto);
    return theater;
  }

  remove(id: number) {
    const index = this.db.theaters.findIndex((t) => t.id === id);
    if (index === -1) throw new NotFoundException(`Theater ${id} not found`);
    this.db.theaters.splice(index, 1);
    return { message: `Theater ${id} deleted successfully` };
  }
}
