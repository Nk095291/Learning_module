import { Database } from '../database/database.service.js';
import { TheatersService } from './theaters.service.js';
import { SeatsService } from './seats.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { MovieShowingsService } from '../movies/movie-showings.service.js';
import { UsersService } from '../users/users.service.js';
import { BookedSeatsService } from '../bookings/booked-seats.service.js';
import { BookingsService } from '../bookings/bookings.service.js';

describe('TheatersService', () => {
  let db: Database;
  let service: TheatersService;

  beforeEach(() => {
    db = new Database();
    service = new TheatersService(db);
  });

  describe('create', () => {
    it('should not overwrite the seeded second theater', () => {
      // given when
      service.create({ name: 'INOX', locality: 'Andheri', city: 'Mumbai', state: 'Maharashtra' });

      // then
      expect(service.findAll()).toHaveLength(3);
      expect(service.findOne(2).name).toBe('PVR Phoenix');
    });

    it('should assign the new theater a fresh id', () => {
      // given when
      const theater = service.create({ name: 'INOX', locality: 'Andheri', city: 'Mumbai', state: 'Maharashtra' });

      // then
      expect(theater.id).toBe(3);
    });

    it('should ignore a client-supplied id', () => {
      // given
      const dto = { name: 'INOX', locality: 'Andheri', city: 'Mumbai', state: 'Maharashtra', id: 1 } as any;

      // when
      const theater = service.create(dto);

      // then
      expect(theater.id).toBe(3);
      expect(service.findOne(1).name).toBe('PVR Phoenix');
    });
  });

  describe('remove', () => {
    let seatsService: SeatsService;
    let movieShowingsService: MovieShowingsService;
    let bookingsService: BookingsService;
    let seat4Id: number;
    let theater2ShowingId: number;
    let theater1BookingId: number;
    let theater2BookingId: number;

    beforeEach(() => {
      seatsService = new SeatsService(db, service);
      const moviesService = new MoviesService(db);
      movieShowingsService = new MovieShowingsService(db, moviesService, service);
      bookingsService = new BookingsService(
        db,
        new UsersService(db),
        movieShowingsService,
        new BookedSeatsService(db),
      );

      // a seat and a showing that belong to theater 2
      const seat4 = seatsService.create({ theaterId: 2, seatNumber: 'A1', row: 'A', col: 1 });
      seat4Id = seat4.id;
      const theater2Showing = movieShowingsService.create({
        movieId: 1,
        theaterId: 2,
        startTime: '18:00',
        endTime: '20:00',
        showDate: '2026-09-23',
      });
      theater2ShowingId = theater2Showing.id;

      // booking on theater 1's seeded showing (showing 1)
      const theater1Booking = bookingsService.create({
        userId: 1,
        movieShowingId: 1,
        bookedSeats: [{ seatId: 1, userId: 1 }],
      });
      theater1BookingId = theater1Booking.id;

      // booking on theater 2's showing
      const theater2Booking = bookingsService.create({
        userId: 1,
        movieShowingId: theater2ShowingId,
        bookedSeats: [{ seatId: seat4Id, userId: 1 }],
      });
      theater2BookingId = theater2Booking.id;
    });

    it('should remove the seats and showings of the deleted theater', () => {
      // when
      service.remove(1);

      // then
      expect(db.seats[1]).toBeUndefined();
      expect(db.seats[2]).toBeUndefined();
      expect(db.seats[3]).toBeUndefined();
      expect(db.movieShowings[1]).toBeUndefined();
    });

    it('should remove the bookings and booked seats for the deleted theaters showings', () => {
      // when
      service.remove(1);

      // then
      expect(db.bookings[theater1BookingId]).toBeUndefined();
      expect(
        Object.values(db.bookedSeats).some((bookedSeat) => bookedSeat.bookingId === theater1BookingId),
      ).toBe(false);
    });

    it('should keep the seat, showing, booking and booked seats of another theater', () => {
      // when
      service.remove(1);

      // then
      expect(db.seats[seat4Id]).toBeDefined();
      expect(db.movieShowings[theater2ShowingId]).toBeDefined();
      expect(db.bookings[theater2BookingId]).toBeDefined();
      expect(
        Object.values(db.bookedSeats).some((bookedSeat) => bookedSeat.bookingId === theater2BookingId),
      ).toBe(true);
    });

    it('should let listing seats, showings and bookings work after the theater is deleted', () => {
      // when
      service.remove(1);

      // then
      expect(() => seatsService.findAll()).not.toThrow();
      expect(() => movieShowingsService.findAll()).not.toThrow();
      expect(() => bookingsService.findAll()).not.toThrow();
    });
  });
});
