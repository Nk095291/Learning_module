import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto.js';
import { UpdateBlogDto } from './dto/update-blog.dto.js';
import { UsersService } from '../users/users.service.js';
import { Database } from '../database/database.service.js';
import { getUserRole } from '../users/roles/get-user-role.js';

@Injectable()
export class BlogsService {

  constructor(private db : Database, 
    private usersService : UsersService,
  ){}


  create(createBlogDto: CreateBlogDto) {
    const author = this.usersService.findOne(createBlogDto.authorId);
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

  update(id: number, updateBlogDto: UpdateBlogDto, actorId: number) {
    if (Number.isNaN(actorId)) throw new BadRequestException('Actor ID is required');
    const blog = this.findOne(id);
    const actor = this.usersService.findOne(actorId);
    const role = getUserRole(actor);

    if (!role.canUpdateBlog(blog)) {
      throw new ForbiddenException(`User ${actorId} cannot update blog ${id}`);
    }

    if (updateBlogDto.authorId) {
      const author = this.usersService.findOne(updateBlogDto.authorId);
    }
    Object.assign(blog, updateBlogDto);
    this.db.blogs[id] = blog;
    return blog;
  }

  remove(id: number, actorId: number) {
    if (Number.isNaN(actorId)) throw new BadRequestException('Actor ID is required');
    const blog = this.findOne(id);
    const actor = this.usersService.findOne(actorId);
    const role = getUserRole(actor);

    if (!role.canDeleteBlog(blog)) {
      throw new ForbiddenException(`User ${actorId} cannot delete blog ${id}`);
    }

    delete this.db.blogs[id];
    return { message: `Blog ${blog.title} (${id}) deleted successfully` };
  }
}
