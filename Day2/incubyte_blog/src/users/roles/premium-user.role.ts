import { Blog } from '../../blogs/entities/blog.entity.js';
import { User } from '../entities/user.entity.js';
import { UserRole } from './user-role.interface.js';

export class PremiumUser implements UserRole {
  constructor(private readonly user: User) {}

  canDeletePost(blog: Blog): boolean {
    return this.user.id === blog.authorId;
  }
}
