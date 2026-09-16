// database.service.ts
import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity.js';
import { Blog } from '../blogs/entities/blog.entity.js';

@Injectable()
export class Database {
  users: User[] = [
    { id: 1, name: 'John', email: 'john@example.com' },
  ];
  blogs: Blog[] = [];

  private userId = 2;
  private blogId = 1;

  nextUserId() {
    return this.userId++;
  }

  nextBlogId() {
    return this.blogId++;
  }
}