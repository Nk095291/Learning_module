import { Blog } from '../../blogs/entities/blog.entity.js';
import { User } from '../entities/user.entity.js';
import { UserRole } from './user-role.interface.js';

export class Admin implements UserRole {
  constructor(private readonly user: User) {}

  canDeleteBlog(_blog: Blog): boolean {
    return true;
  }
  canUpdateBlog(_blog: Blog): boolean {
    return true;
  }
  canUpdate(user: User): boolean {
    return true;
  }
  canUpdateRole(): boolean {
    return true;
  }
  canDelete(user: User): boolean {
    return true;
  }
}
