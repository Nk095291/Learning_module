import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto.js';
import { UserRoleName } from '../entities/user.entity.js';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    role? : UserRoleName;
}
