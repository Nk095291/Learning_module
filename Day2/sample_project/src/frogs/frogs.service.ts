import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFrogDto } from './dto/create-frog.dto.js';
import { UpdateFrogDto } from './dto/update-frog.dto.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class FrogsService {
  constructor(private db: Database) {}

  create(createFrogDto: CreateFrogDto) {
    const frog = { id: this.db.nextFrogId(), ...createFrogDto };
    this.db.frogs.push(frog);
    return frog;
  }

  findAll() {
    return this.db.frogs;
  }

  findOne(id: number) {
    const frog = this.db.frogs.find((f) => f.id === id);
    if (!frog) throw new NotFoundException(`Frog ${id} not found`);
    return frog;
  }

  update(id: number, updateFrogDto: UpdateFrogDto) {
    const frog = this.findOne(id);
    Object.assign(frog, updateFrogDto);
    return frog;
  }

  remove(id: number) {
    const index = this.db.frogs.findIndex((f) => f.id === id);
    if (index === -1) throw new NotFoundException(`Frog ${id} not found`);
    this.db.frogs.splice(index, 1);
    return { message: `Frog ${id} deleted successfully` };
  }
}
