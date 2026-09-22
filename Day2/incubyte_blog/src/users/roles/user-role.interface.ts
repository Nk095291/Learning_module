import { Blog } from '../../blogs/entities/blog.entity.js';

export interface UserRole {
  canDeletePost(blog: Blog): boolean;
}
