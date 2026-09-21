import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { FrogsService } from './frogs.service.js';
import { CreateFrogDto } from './dto/create-frog.dto.js';
import { UpdateFrogDto } from './dto/update-frog.dto.js';

@Controller('frogs')
export class FrogsController {
  constructor(private readonly frogsService: FrogsService) {}

  @Post()
  create(@Body() createFrogDto: CreateFrogDto) {
    return this.frogsService.create(createFrogDto);
  }

  @Get()
  findAll() {
    return this.frogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.frogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFrogDto: UpdateFrogDto) {
    return this.frogsService.update(+id, updateFrogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.frogsService.remove(+id);
  }
}
