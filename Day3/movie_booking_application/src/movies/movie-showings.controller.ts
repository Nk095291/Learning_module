import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MovieShowingsService } from './movie-showings.service.js';
import { CreateMovieShowingDto } from './dto/create-movie-showing.dto.js';
import { UpdateMovieShowingDto } from './dto/update-movie-showing.dto.js';

@Controller('movie-showings')
export class MovieShowingsController {
  constructor(private readonly movieShowingsService: MovieShowingsService) {}

  @Post()
  create(@Body() createMovieShowingDto: CreateMovieShowingDto) {
    return this.movieShowingsService.create(createMovieShowingDto);
  }

  @Get()
  findAll() {
    return this.movieShowingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movieShowingsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMovieShowingDto: UpdateMovieShowingDto,
  ) {
    return this.movieShowingsService.update(+id, updateMovieShowingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movieShowingsService.remove(+id);
  }
}
