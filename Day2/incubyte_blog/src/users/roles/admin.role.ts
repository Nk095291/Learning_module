import { Blog } from '../../blogs/entities/blog.entity.js';
import { User } from '../entities/user.entity.js';
import { UserRole } from './user-role.interface.js';

export class Admin implements UserRole {
  constructor(private readonly user: User) {}

  canDeletePost(_blog: Blog): boolean {
    return true;
  }
}
