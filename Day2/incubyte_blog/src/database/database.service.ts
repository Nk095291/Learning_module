// database.service.ts
import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity.js';
import { Blog } from '../blogs/entities/blog.entity.js';

@Injectable()
export class Database {
  users: Record<number, User> = {
    1: { id: 1, name: 'John', email: 'john@example.com', role: 'free' },
    2: { id: 2, name: 'Jane', email: 'jane@example.com', role: 'premium' },
    3: { id: 3, name: 'Ada', email: 'ada@example.com', role: 'admin' },
  };
  blogs: Record<number, Blog> = {};

  private userId = 4;
  private blogId = 1;

  nextUserId() {
    return this.userId++;
  }

  nextBlogId() {
    return this.blogId++;
  }

  removeByAuthorId(authorId: number) {
    Object.values(this.blogs).forEach((blog) => {
      if (blog.authorId === authorId) {
        delete this.blogs[blog.id];
      }
    });
  }
}