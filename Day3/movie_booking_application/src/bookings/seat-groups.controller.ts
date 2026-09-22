import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SeatGroupsService } from './seat-groups.service.js';
import { CreateSeatGroupDto } from './dto/create-seat-group.dto.js';
import { UpdateSeatGroupDto } from './dto/update-seat-group.dto.js';

@Controller('seat-groups')
export class SeatGroupsController {
  constructor(private readonly seatGroupsService: SeatGroupsService) {}

  @Post()
  create(@Body() createSeatGroupDto: CreateSeatGroupDto) {
    return this.seatGroupsService.create(createSeatGroupDto);
  }

  @Get()
  findAll() {
    return this.seatGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.seatGroupsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSeatGroupDto: UpdateSeatGroupDto,
  ) {
    return this.seatGroupsService.update(+id, updateSeatGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.seatGroupsService.remove(+id);
  }
}
