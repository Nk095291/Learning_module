// database.service.ts
import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity.js';
import { Blog } from '../blogs/entities/blog.entity.js';

@Injectable()
export class Database {
  users: User[] = [
    { id: 1, name: 'John', email: 'john@example.com', role: 'free' },
    { id: 2, name: 'Jane', email: 'jane@example.com', role: 'premium' },
    { id: 3, name: 'Ada', email: 'ada@example.com', role: 'admin' },
  ];
  blogs: Blog[] = [];

  private userId = 4;
  private blogId = 1;

  nextUserId() {
    return this.userId++;
  }

  nextBlogId() {
    return this.blogId++;
  }
}