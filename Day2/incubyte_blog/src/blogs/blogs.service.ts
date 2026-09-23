import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto.js';
import { UpdateBlogDto } from './dto/update-blog.dto.js';
import { UsersService } from '../users/users.service.js';
import { Database } from '../database/database.service.js';
import { createUserRole } from '../users/roles/create-user-role.js';

@Injectable()
export class BlogsService {

  constructor(private db : Database, 
    private usersService : UsersService,
  ){}


  create(createBlogDto: CreateBlogDto) {
    const author = this.usersService.findOne(createBlogDto.authorId);

    if(!author) throw new NotFoundException(`Author ${createBlogDto.authorId} not found`);

    const blog = { id : this.db.nextBlogId(), ...createBlogDto, author};
    this.db.blogs[blog.id] = blog;
    return blog;
  }

  findAll() {
    return Object.values(this.db.blogs).map((blog) => ({
      ...blog,
      author : this.usersService.findOne(blog.authorId),
    }));
  }

  findOne(id: number) {
    const blog = this.db.blogs[id];
    if(!blog) throw new NotFoundException(`Blog ${id} not found`);
    return {
      ...blog,
      author : this.usersService.findOne(blog.authorId),
    };
  }

  update(id: number, updateBlogDto: UpdateBlogDto) {
    const blog = this.findOne(id);
  
    if (updateBlogDto.authorId) {
      const author = this.usersService.findOne(updateBlogDto.authorId);
      if(!author) throw new NotFoundException(`Author ${updateBlogDto.authorId} not found`);
    }
    Object.assign(blog, updateBlogDto);
    this.db.blogs[id] = blog;
    return blog;
  }

  remove(id: number, actorId: number) {
    const blog = this.findOne(id);
    const actor = this.usersService.findOne(actorId);
    const role = createUserRole(actor);

    if (!role.canDeletePost(blog)) {
      throw new ForbiddenException(`User ${actorId} cannot delete blog ${id}`);
    }

    delete this.db.blogs[id];
    return { message: `Blog ${blog.title} (${id}) deleted successfully` };
  }
}
