import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { UpdateMovieDto } from './dto/update-movie.dto.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class MoviesService {
  constructor(private db: Database) {}

  create(createMovieDto: CreateMovieDto) {
    const movie = {
      ...createMovieDto,
      id: this.db.nextMovieId(),
      created_at: new Date(),
    };
    this.db.movies[movie.id] = movie;
    return movie;
  }

  findAll() {
    return Object.values(this.db.movies);
  }

  findOne(id: number) {
    const movie = this.db.movies[id];
    if (!movie) throw new NotFoundException(`Movie ${id} not found`);
    return movie;
  }

  update(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = this.findOne(id);
    Object.assign(movie, updateMovieDto);
    this.db.movies[id] = movie;
    return movie;
  }

  remove(id: number) {
    const movie = this.findOne(id);
    this.db.removeMovieShowingsByMovieId(id);
    delete this.db.movies[id];
    return { message: `Movie ${movie.title} (${id}) deleted successfully` };
  }
}
