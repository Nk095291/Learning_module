import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Database } from '../database/database.service.js';
import { DEFAULT_ROLE, USER_ROLES } from './entities/user.entity.js';
import { getUserRole } from './roles/get-user-role.js';

@Injectable()
export class UsersService {
  constructor(private db : Database) {}

  create(createUserDto: CreateUserDto) {
    const user = { 
      id : this.db.nextUserId(),
      ...createUserDto,
      role: DEFAULT_ROLE,
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

  update(id: number, updateUserDto: UpdateUserDto, actorId: number) {
    if (isNaN(actorId)) {
      throw new BadRequestException('Invalid actor id');
    }
    const actor = this.findOne(actorId);
    const user = this.findOne(id);
    const actorRole = getUserRole(actor);

    if(!actorRole.canUpdate(user)) {
      throw new UnauthorizedException(`User ${actorId} cannot update user ${id}`);
    }

    if(updateUserDto.role && user.role != updateUserDto.role ) {

      if( !actorRole.canUpdateRole() ) {
        throw new BadRequestException(`Cannot update role of the user`);
      }

      if( !USER_ROLES.includes(updateUserDto.role) ) {
        throw new BadRequestException(`Invalid role`);
      }
    }

    Object.assign(user, updateUserDto);
    this.db.users[id] = user;
    return user;
  }

  remove(id: number, actorId: number) {
    if (isNaN(actorId)) {
      throw new BadRequestException('Invalid actor id');
    }
    const actor = this.findOne(actorId);
    const user = this.findOne(id);
    const actorRole = getUserRole(actor);

    if(!actorRole.canDelete(user)) {
      throw new UnauthorizedException(`User ${actorId} cannot delete user ${id}`);
    }

    this.db.removeByAuthorId(id);

    delete this.db.users[id];
    return { message: `User ${user.name} (${id}) deleted successfully` };
  }
}
