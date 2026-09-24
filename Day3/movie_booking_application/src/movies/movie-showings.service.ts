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
    this.db.movieShowings[movieShowing.id] = movieShowing;
    return movieShowing;
  }

  findAll() {
    return Object.values(this.db.movieShowings).map((movieShowing) => {
      return {
        ...movieShowing,
        availableSeats: this.db.getAvailableSeats(movieShowing.id),
        theater: this.theatersService.findOne(movieShowing.theaterId),
        movie: this.moviesService.findOne(movieShowing.movieId),
      };
    });
  }

  findOne(id: number) {
    const movieShowing = this.db.movieShowings[id];
    if (!movieShowing)
      throw new NotFoundException(`Movie showing ${id} not found`);
    return {
      ...movieShowing,
      availableSeats: this.db.getAvailableSeats(movieShowing.id),
      theater: this.theatersService.findOne(movieShowing.theaterId),
      movie: this.moviesService.findOne(movieShowing.movieId),
    };
  }
}
