import { ForbiddenException } from '@nestjs/common';
import { Database } from '../database/database.service.js';
import { UsersService } from './users.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { TheatersService } from '../theaters/theaters.service.js';
import { MovieShowingsService } from '../movies/movie-showings.service.js';
import { BookedSeatsService } from '../bookings/booked-seats.service.js';
import { BookingsService } from '../bookings/bookings.service.js';

describe('UsersService', () => {
  let db: Database;
  let service: UsersService;

  beforeEach(() => {
    db = new Database();
    service = new UsersService(db);
  });

  describe('create', () => {
    it('should not overwrite the seeded second user', () => {
      // given when
      service.create({ email: 'new@example.com', dob: '1999-01-01' });

      // then
      expect(service.findOne(2).email).toBe('jane@example.com');
      expect(service.findAll()).toHaveLength(3);
    });

    it('should assign the new user a fresh id', () => {
      // given when
      const user = service.create({ email: 'new@example.com', dob: '1999-01-01' });

      // then
      expect(user.id).toBe(3);
    });

    it('should ignore a client-supplied id', () => {
      // given
      const dto = { email: 'new@example.com', dob: '1999-01-01', id: 1 } as any;

      // when
      const user = service.create(dto);

      // then
      expect(user.id).toBe(3);
      expect(service.findOne(1).email).toBe('john@example.com');
    });

    it('should ignore a client-supplied created_at', () => {
      // given
      const suppliedCreatedAt = new Date('2000-01-01');
      const dto = { email: 'new@example.com', dob: '1999-01-01', created_at: suppliedCreatedAt } as any;

      // when
      const user = service.create(dto);

      // then
      expect(user.created_at).not.toEqual(suppliedCreatedAt);
    });
  });

  describe('remove', () => {
    let bookingsService: BookingsService;
    let user1BookingId: number;
    let user2BookingId: number;

    beforeEach(() => {
      const moviesService = new MoviesService(db);
      const theatersService = new TheatersService(db);
      const movieShowingsService = new MovieShowingsService(db, moviesService, theatersService);
      bookingsService = new BookingsService(
        db,
        service,
        movieShowingsService,
        new BookedSeatsService(db),
      );

      const user1Booking = bookingsService.create({
        userId: 1,
        movieShowingId: 1,
        bookedSeats: [{ seatId: 1, userId: 1 }],
      });
      user1BookingId = user1Booking.id;

      const user2Booking = bookingsService.create({
        userId: 2,
        movieShowingId: 1,
        bookedSeats: [{ seatId: 2, userId: 2 }],
      });
      user2BookingId = user2Booking.id;
    });

    it('should remove the users bookings and their booked seats when the user deletes their own account', () => {
      // when
      service.remove(1, 1);

      // then
      expect(db.bookings[user1BookingId]).toBeUndefined();
      expect(
        Object.values(db.bookedSeats).some((bookedSeat) => bookedSeat.bookingId === user1BookingId),
      ).toBe(false);
    });

    it('should keep another users bookings and booked seats', () => {
      // when
      service.remove(1, 1);

      // then
      expect(db.bookings[user2BookingId]).toBeDefined();
      expect(
        Object.values(db.bookedSeats).some((bookedSeat) => bookedSeat.bookingId === user2BookingId),
      ).toBe(true);
    });

    it('should let listing bookings work after the user is deleted', () => {
      // when
      service.remove(1, 1);

      // then
      expect(() => bookingsService.findAll()).not.toThrow();
    });

    it('should reject deleting another users account with 403 and remove nothing', () => {
      // when
      const deleteUser = () => service.remove(1, 2);

      // then
      expect(deleteUser).toThrow(ForbiddenException);
      expect(deleteUser).toThrow('User 2 cannot delete user 1');
      expect(db.users[1]).toBeDefined();
      expect(db.bookings[user1BookingId]).toBeDefined();
      expect(
        Object.values(db.bookedSeats).some((bookedSeat) => bookedSeat.bookingId === user1BookingId),
      ).toBe(true);
    });
  });
});
