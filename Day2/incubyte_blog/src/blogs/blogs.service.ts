import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto.js';
import { UpdateBlogDto } from './dto/update-blog.dto.js';
import { UsersService } from '../users/users.service.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class BlogsService {

  constructor(private db : Database, 
    private usersService : UsersService,
  ){}


  create(createBlogDto: CreateBlogDto) {
    const author = this.usersService.findOne(createBlogDto.authorId);

    if(!author) throw new NotFoundException(`Author ${createBlogDto.authorId} not found`);

    const blog = { id : this.db.nextBlogId(), ...createBlogDto, author};
    this.db.blogs.push(blog);
    return blog;
  }

  findAll() {
    return this.db.blogs.map((blog) => ({
      ...blog,
      author : this.usersService.findOne(blog.authorId),
    }));
  }

  findOne(id: number) {
    const blog = this.db.blogs.find((b) => b.id === id);
    if(!blog) throw new NotFoundException(`Blog ${id} not found`);
    return {
      ...blog,
      author : this.usersService.findOne(blog.authorId),
    };
  }

  update(id: number, updateBlogDto: UpdateBlogDto) {
    const blog = this.findOne(id);
    if(!blog) throw new NotFoundException(`Blog ${id} not found`);
  
    if (updateBlogDto.authorId) {
      const author = this.usersService.findOne(updateBlogDto.authorId);
      if(!author) throw new NotFoundException(`Author ${updateBlogDto.authorId} not found`);
    }
    Object.assign(blog, updateBlogDto);
    return blog;
  }

  remove(id: number) {
    const index = this.db.blogs.findIndex((b) => b.id === id);
    if(index === -1) throw new NotFoundException(`Blog ${id} not found`);
    this.db.blogs.splice(index, 1);
    return { message: `Blog ${id} deleted successfully` };
  }
}
