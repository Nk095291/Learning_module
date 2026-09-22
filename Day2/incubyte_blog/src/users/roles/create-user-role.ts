import { User } from '../entities/user.entity.js';
import { Admin } from './admin.role.js';
import { FreeUser } from './free-user.role.js';
import { PremiumUser } from './premium-user.role.js';
import { UserRole } from './user-role.interface.js';

export function createUserRole(user: User): UserRole {
  switch (user.role) {
    case 'admin':
      return new Admin(user);
    case 'premium':
      return new PremiumUser(user);
    default:
      return new FreeUser(user);
  }
}
