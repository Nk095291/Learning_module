import { User } from '../entities/user.entity.js';
import { NonAdminRole } from './user-role.interface.js';

export class PremiumUser extends NonAdminRole {
  constructor(user: User) {
    super(user);
  }
}
