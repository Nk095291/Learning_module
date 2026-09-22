import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieShowingDto } from './dto/create-movie-showing.dto.js';
import { UpdateMovieShowingDto } from './dto/update-movie-showing.dto.js';
import { Database } from '../database/database.service.js';
import { MoviesService } from './movies.service.js';
import { TheatersService } from '../theaters/theaters.service.js';

@Injectable()
export class MovieShowingsService {
  constructor(
    private db: Database,
    private moviesService: MoviesService,
    private theatersService: TheatersService,
  ) {}

  create(createMovieShowingDto: CreateMovieShowingDto) {
    this.moviesService.findOne(createMovieShowingDto.movieId);
    this.theatersService.findOne(createMovieShowingDto.theaterId);
    const movieShowing = {
      id: this.db.nextMovieShowingId(),
      ...createMovieShowingDto,
      created_at: new Date(),
    };
    this.db.movieShowings.push(movieShowing);
    return movieShowing;
  }

  findAll() {
    return this.db.movieShowings;
  }

  findOne(id: number) {
    const movieShowing = this.db.movieShowings.find((s) => s.id === id);
    if (!movieShowing)
      throw new NotFoundException(`Movie showing ${id} not found`);
    return movieShowing;
  }

  update(id: number, updateMovieShowingDto: UpdateMovieShowingDto) {
    const movieShowing = this.findOne(id);
    if (updateMovieShowingDto.movieId) {
      this.moviesService.findOne(updateMovieShowingDto.movieId);
    }
    if (updateMovieShowingDto.theaterId) {
      this.theatersService.findOne(updateMovieShowingDto.theaterId);
    }
    Object.assign(movieShowing, updateMovieShowingDto);
    return movieShowing;
  }

  remove(id: number) {
    const index = this.db.movieShowings.findIndex((s) => s.id === id);
    if (index === -1)
      throw new NotFoundException(`Movie showing ${id} not found`);
    this.db.movieShowings.splice(index, 1);
    return { message: `Movie showing ${id} deleted successfully` };
  }
}
