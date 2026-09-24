import { Database } from '../database/database.service.js';
import { MoviesService } from './movies.service.js';
import { TheatersService } from '../theaters/theaters.service.js';
import { MovieShowingsService } from './movie-showings.service.js';
import { UsersService } from '../users/users.service.js';
import { BookedSeatsService } from '../bookings/booked-seats.service.js';
import { BookingsService } from '../bookings/bookings.service.js';

describe('MoviesService', () => {
  let db: Database;
  let service: MoviesService;

  beforeEach(() => {
    db = new Database();
    service = new MoviesService(db);
  });

  describe('create', () => {
    it('should assign the new movie a fresh id', () => {
      // given when
      const movie = service.create({ title: 'Interstellar', ageRating: 13 });

      // then
      expect(movie.id).toBe(2);
    });

    it('should ignore a client-supplied id', () => {
      // given
      const dto = { title: 'Interstellar', ageRating: 13, id: 1 } as any;

      // when
      const movie = service.create(dto);

      // then
      expect(movie.id).toBe(2);
      expect(db.movies[1].title).toBe('Inception');
    });

    it('should ignore a client-supplied created_at', () => {
      // given
      const suppliedCreatedAt = new Date('2000-01-01');
      const dto = { title: 'Interstellar', ageRating: 13, created_at: suppliedCreatedAt } as any;

      // when
      const movie = service.create(dto);

      // then
      expect(movie.created_at).not.toEqual(suppliedCreatedAt);
    });
  });

  describe('findAll', () => {
    it('should return an array of movies that includes Inception', () => {
      // given when
      const movies = service.findAll();

      // then
      expect(Array.isArray(movies)).toBe(true);
      expect(movies).toContainEqual(expect.objectContaining({ id: 1, title: 'Inception' }));
    });
  });

  describe('remove', () => {
    let theatersService: TheatersService;
    let movieShowingsService: MovieShowingsService;
    let bookingsService: BookingsService;
    let showing1BookingId: number;
    let movie2ShowingId: number;
    let movie2BookingId: number;

    beforeEach(() => {
      theatersService = new TheatersService(db);
      movieShowingsService = new MovieShowingsService(db, service, theatersService);
      bookingsService = new BookingsService(
        db,
        new UsersService(db),
        movieShowingsService,
        new BookedSeatsService(db),
      );

      // second movie with its own showing and booking
      const movie2 = service.create({ title: 'Interstellar', ageRating: 13 });
      const movie2Showing = movieShowingsService.create({
        movieId: movie2.id,
        theaterId: 1,
        startTime: '18:00',
        endTime: '20:00',
        showDate: '2026-09-23',
      });
      movie2ShowingId = movie2Showing.id;

      // booking on movie 1's seeded showing (showing 1)
      const showing1Booking = bookingsService.create({
        userId: 1,
        movieShowingId: 1,
        bookedSeats: [{ seatId: 1, userId: 1 }],
      });
      showing1BookingId = showing1Booking.id;

      // booking on movie 2's showing
      const movie2Booking = bookingsService.create({
        userId: 1,
        movieShowingId: movie2ShowingId,
        bookedSeats: [{ seatId: 2, userId: 1 }],
      });
      movie2BookingId = movie2Booking.id;
    });

    it('should remove the showings of the deleted movie', () => {
      // when
      service.remove(1);

      // then
      expect(db.movieShowings[1]).toBeUndefined();
    });

    it('should remove the bookings and booked seats for the deleted movies showings', () => {
      // when
      service.remove(1);

      // then
      expect(db.bookings[showing1BookingId]).toBeUndefined();
      expect(
        Object.values(db.bookedSeats).some((bookedSeat) => bookedSeat.bookingId === showing1BookingId),
      ).toBe(false);
    });

    it('should keep the showing, booking and booked seats of a movie that was not deleted', () => {
      // when
      service.remove(1);

      // then
      expect(db.movieShowings[movie2ShowingId]).toBeDefined();
      expect(db.bookings[movie2BookingId]).toBeDefined();
      expect(
        Object.values(db.bookedSeats).some((bookedSeat) => bookedSeat.bookingId === movie2BookingId),
      ).toBe(true);
    });

    it('should let listing showings and bookings work after the movie is deleted, with nothing left for that movie', () => {
      // when
      service.remove(1);

      // then
      expect(() => movieShowingsService.findAll()).not.toThrow();
      expect(() => bookingsService.findAll()).not.toThrow();
      expect(movieShowingsService.findAll().some((showing) => showing.id === 1)).toBe(false);
      expect(bookingsService.findAll().some((booking) => booking.id === showing1BookingId)).toBe(false);
    });
  });
});
