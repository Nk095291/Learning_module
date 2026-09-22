import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class UsersService {
  constructor(private db: Database) {}

  create(createUserDto: CreateUserDto) {
    const user = {
      id: this.db.nextUserId(),
      ...createUserDto,
      created_at: new Date(),
    };
    this.db.users.push(user);
    return user;
  }

  findAll() {
    return this.db.users;
  }

  findOne(id: number) {
    const user = this.db.users.find((u) => u.id === id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    const user = this.findOne(id);
    Object.assign(user, updateUserDto);
    return user;
  }

  remove(id: number) {
    const index = this.db.users.findIndex((u) => u.id === id);
    if (index === -1) throw new NotFoundException(`User ${id} not found`);
    this.db.users.splice(index, 1);
    return { message: `User ${id} deleted successfully` };
  }
}
