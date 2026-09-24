import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { BlogsService } from './blogs.service.js';
import { CreateBlogDto } from './dto/create-blog.dto.js';
import { UpdateBlogDto } from './dto/update-blog.dto.js';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Post()
  create(@Body() createBlogDto: CreateBlogDto) {
    return this.blogsService.create(createBlogDto);
  }

  @Get()
  findAll() {
    return this.blogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto, @Headers('user-id') actorId: number) {
    return this.blogsService.update(+id, updateBlogDto, actorId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('user-id') actorId: number) {
    return this.blogsService.remove(+id, actorId);
  }
}
