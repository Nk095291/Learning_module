import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Database } from '../database/database.service.js';
import { UserRoleName } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(private db : Database) {}

  create(createUserDto: CreateUserDto) {
    const user = { 
      id : this.db.nextUserId(),
      ...createUserDto,
      role: createUserDto.role ?? 'free',
    };

    this.db.users[user.id] = user;
    return user;
  }

  findAll() {
    return Object.values(this.db.users);
  }

  findOne(id: number) {
    const user = this.db.users[id];

    if (!user) 
      throw new NotFoundException(`User ${id} not found`);

    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    const user = this.db.users[id];
    Object.assign(user, updateUserDto);
    this.db.users[id] = user;
    return user;
  }

  remove(id: number) {
    const user = this.findOne(id);
    delete this.db.users[id];
    return { message: `User ${user.name} (${id}) deleted successfully` };
  }
}
