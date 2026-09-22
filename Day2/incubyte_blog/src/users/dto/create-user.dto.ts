import { UserRoleName } from '../entities/user.entity.js';

export class CreateUserDto {
    name : string;
    email : string;
    role : UserRoleName;
}
