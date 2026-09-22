import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { UpdateMovieDto } from './dto/update-movie.dto.js';
import { Database } from '../database/database.service.js';

@Injectable()
export class MoviesService {
  constructor(private db: Database) {}

  create(createMovieDto: CreateMovieDto) {
    const movie = {
      id: this.db.nextMovieId(),
      ...createMovieDto,
      created_at: new Date(),
    };
    this.db.movies.push(movie);
    return movie;
  }

  findAll() {
    return this.db.movies;
  }

  findOne(id: number) {
    const movie = this.db.movies.find((m) => m.id === id);
    if (!movie) throw new NotFoundException(`Movie ${id} not found`);
    return movie;
  }

  update(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = this.findOne(id);
    Object.assign(movie, updateMovieDto);
    return movie;
  }

  remove(id: number) {
    const index = this.db.movies.findIndex((m) => m.id === id);
    if (index === -1) throw new NotFoundException(`Movie ${id} not found`);
    this.db.movies.splice(index, 1);
    return { message: `Movie ${id} deleted successfully` };
  }
}
