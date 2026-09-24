import { Blog } from '../../blogs/entities/blog.entity.js';
import { User } from '../entities/user.entity.js';

export interface UserRole {
  canDeleteBlog(blog: Blog): boolean;
  canUpdateBlog(blog: Blog): boolean;
  canUpdate(user: User): boolean;
  canUpdateRole(): boolean;
  canDelete(user: User): boolean;
}


export class NonAdminRole implements UserRole {
    constructor(private readonly user: User) {}

  canDeleteBlog(blog: Blog): boolean {
    return this.user.id === blog.authorId;
  }
  canUpdateBlog(blog: Blog): boolean {
    return this.user.id === blog.authorId;
  }
  canUpdate(user: User): boolean {
    return this.user.id === user.id;
  }
  canUpdateRole(): boolean {
    return false;
  }
  canDelete(user: User): boolean {
    return this.user.id === user.id;
  }
}