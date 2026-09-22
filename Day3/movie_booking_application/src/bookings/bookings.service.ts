import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { Database } from '../database/database.service.js';
import { UsersService } from '../users/users.service.js';
import { MovieShowingsService } from '../movies/movie-showings.service.js';
import { MoviesService } from '../movies/movies.service.js';

@Injectable()
export class BookingsService {
  constructor(
    private db: Database,
    private usersService: UsersService,
    private movieShowingsService: MovieShowingsService,
    private moviesService: MoviesService,
  ) {}

  create(createBookingDto: CreateBookingDto) {
    const user = this.usersService.findOne(createBookingDto.userId);
    const showing = this.movieShowingsService.findOne(
      createBookingDto.movieShowingId,
    );
    const movie = this.moviesService.findOne(showing.movieId);

    this.assertAgeRating(user.dob, movie.ageRating);

    const booking = {
      id: this.db.nextBookingId(),
      ...createBookingDto,
      created_at: new Date(),
    };
    this.db.bookings.push(booking);
    return booking;
  }

  findAll() {
    return this.db.bookings;
  }

  findOne(id: number) {
    const booking = this.db.bookings.find((b) => b.id === id);
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    const booking = this.findOne(id);
    if (updateBookingDto.userId) {
      this.usersService.findOne(updateBookingDto.userId);
    }
    if (updateBookingDto.movieShowingId) {
      this.movieShowingsService.findOne(updateBookingDto.movieShowingId);
    }
    Object.assign(booking, updateBookingDto);
    return booking;
  }

  remove(id: number) {
    const index = this.db.bookings.findIndex((b) => b.id === id);
    if (index === -1) throw new NotFoundException(`Booking ${id} not found`);
    this.db.bookings.splice(index, 1);
    return { message: `Booking ${id} deleted successfully` };
  }

  private assertAgeRating(dob: string, ageRating: number) {
    const age = Math.floor(
      (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    if (age < ageRating) {
      throw new BadRequestException(
        `User must be at least ${ageRating} to book this movie`,
      );
    }
  }
}
