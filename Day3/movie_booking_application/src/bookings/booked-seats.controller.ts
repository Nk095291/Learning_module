import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BookedSeatsService } from './booked-seats.service.js';
import { CreateBookedSeatDto } from './dto/create-booked-seat.dto.js';
import { UpdateBookedSeatDto } from './dto/update-booked-seat.dto.js';

@Controller('booked-seats')
export class BookedSeatsController {
  constructor(private readonly bookedSeatsService: BookedSeatsService) {}

  @Post()
  create(@Body() createBookedSeatDto: CreateBookedSeatDto) {
    return this.bookedSeatsService.create(createBookedSeatDto);
  }

  @Get()
  findAll() {
    return this.bookedSeatsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookedSeatsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookedSeatDto: UpdateBookedSeatDto,
  ) {
    return this.bookedSeatsService.update(+id, updateBookedSeatDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookedSeatsService.remove(+id);
  }
}
