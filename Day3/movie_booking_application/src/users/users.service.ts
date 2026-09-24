import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class UsersService {
  constructor(private db: Database) {}

  create(createUserDto: CreateUserDto) {
    const user = {
      ...createUserDto,
      id: this.db.nextUserId(),
      created_at: new Date(),
    };
    this.db.users[user.id] = user;
    return user;
  }

  findAll() {
    return Object.values(this.db.users);
  }

  findOne(id: number) {
    const user = this.db.users[id];
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto, userId: number) {
    if (isNaN(userId)) throw new BadRequestException('Invalid actor id');
    if (userId != id) throw new ForbiddenException(`User ${userId} cannot update user ${id}`)
    const user = this.findOne(id);
    Object.assign(user, updateUserDto);
    this.db.users[id] = user;
    return user;
  }

  remove(id: number, userId: number) {
    if (isNaN(userId)) throw new BadRequestException('Invalid actor id');
    if (userId != id) throw new ForbiddenException(`User ${userId} cannot delete user ${id}`)
    const user = this.findOne(id);
    delete this.db.users[id];
    return { message: `User ${user.email} (${id}) deleted successfully` };
  } 
}
