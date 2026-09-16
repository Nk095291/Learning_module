import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MousesService } from './mouses.service.js';
import { CreateMouseDto } from './dto/create-mouse.dto.js';
import { UpdateMouseDto } from './dto/update-mouse.dto.js';

@Controller('mouses')
export class MousesController {
  constructor(private readonly mousesService: MousesService) {}

  @Post()
  create(@Body() createMouseDto: CreateMouseDto) {
    return this.mousesService.create(createMouseDto);
  }

  @Get()
  findAll() {
    return this.mousesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mousesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMouseDto: UpdateMouseDto) {
    return this.mousesService.update(+id, updateMouseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mousesService.remove(+id);
  }
}
