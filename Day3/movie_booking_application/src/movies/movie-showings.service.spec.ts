import { Database } from '../database/database.service.js';
import { MovieShowingsService } from './movie-showings.service.js';
import { MoviesService } from './movies.service.js';
import { TheatersService } from '../theaters/theaters.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { UsersService } from '../users/users.service.js';
import { BookedSeatsService } from '../bookings/booked-seats.service.js';

describe('MovieShowingsService', () => {
  let db: Database;
  let movieShowingsService: MovieShowingsService;
  let bookingsService: BookingsService;

  beforeEach(() => {
    db = new Database();
    movieShowingsService = new MovieShowingsService(
      db,
      new MoviesService(db),
      new TheatersService(db),
    );
    bookingsService = new BookingsService(
      db,
      new UsersService(db),
      movieShowingsService,
      new BookedSeatsService(db),
    );
  });

  describe('create', () => {
    it('should ignore a client-supplied id', () => {
      // given
      const dto = {
        movieId: 1,
        theaterId: 1,
        startTime: '21:00',
        endTime: '23:59',
        showDate: '2026-09-22',
        id: 1,
      } as any;

      // when
      const showing = movieShowingsService.create(dto);

      // then
      expect(showing.id).toBe(2);
      expect(db.movieShowings[1].startTime).toBe('18:00');
    });

    it('should ignore a client-supplied created_at', () => {
      // given
      const suppliedCreatedAt = new Date('2000-01-01');
      const dto = {
        movieId: 1,
        theaterId: 1,
        startTime: '21:00',
        endTime: '23:59',
        showDate: '2026-09-22',
        created_at: suppliedCreatedAt,
      } as any;

      // when
      const showing = movieShowingsService.create(dto);

      // then
      expect(showing.created_at).not.toEqual(suppliedCreatedAt);
    });
  });

  describe('findOne', () => {
    it('should leave out a seat booked for that showing from the available seats', () => {
      // given
      bookingsService.create({
        userId: 1,
        movieShowingId: 1,
        bookedSeats: [{ seatId: 2, userId: 1 }],
      });

      // when
      const showing = movieShowingsService.findOne(1);

      // then
      expect(showing.availableSeats.map((seat) => seat.id)).toEqual([1, 3]);
    });

    it('should still count a seat booked for another showing as available', () => {
      // given
      movieShowingsService.create({
        movieId: 1,
        theaterId: 1,
        startTime: '21:00',
        endTime: '23:59',
        showDate: '2026-09-22',
      });
      bookingsService.create({
        userId: 1,
        movieShowingId: 2,
        bookedSeats: [{ seatId: 1, userId: 1 }],
      });

      // when
      const showing = movieShowingsService.findOne(1);

      // then
      expect(showing.availableSeats.map((seat) => seat.id)).toEqual([1, 2, 3]);
    });

    it('should only include seats from the showings theater', () => {
      // given
      db.seats[4] = { id: 4, theaterId: 2, seatNumber: 'A1', row: 'A', col: 1 };

      // when
      const showing = movieShowingsService.findOne(1);

      // then
      expect(showing.availableSeats.map((seat) => seat.id)).not.toContain(4);
    });
  });
});
