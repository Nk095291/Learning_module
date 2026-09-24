import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Database } from '../database/database.service.js';
import { SeatsService } from './seats.service.js';
import { TheatersService } from './theaters.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { BookedSeatsService } from '../bookings/booked-seats.service.js';
import { UsersService } from '../users/users.service.js';
import { MovieShowingsService } from '../movies/movie-showings.service.js';
import { MoviesService } from '../movies/movies.service.js';

describe('SeatsService', () => {
  let db: Database;
  let service: SeatsService;

  beforeEach(() => {
    db = new Database();
    service = new SeatsService(db, new TheatersService(db));
  });

  describe('create', () => {
    it('should ignore a client-supplied id', () => {
      // given
      const dto = { theaterId: 1, seatNumber: 'C1', row: 'C', col: 1, id: 1 } as any;

      // when
      const seat = service.create(dto);

      // then
      expect(seat.id).toBe(4);
      expect(db.seats[1].seatNumber).toBe('A1');
    });
  });

  describe('update', () => {
    it('should save the new seatNumber without adding a theater property to the stored seat', () => {
      // given when
      service.update(1, { seatNumber: 'A1X' });

      // then
      expect(db.seats[1].seatNumber).toBe('A1X');
      expect(db.seats[1]).not.toHaveProperty('theater');
    });

    it('should return the updated seat', () => {
      // given when
      const seat = service.update(1, { seatNumber: 'A1X' });

      // then
      expect(seat).toEqual(expect.objectContaining({ id: 1, seatNumber: 'A1X' }));
    });

    it('should reject changing the seat theaterId and leave the stored seat unchanged', () => {
      // given
      const seatNumberBefore = db.seats[1].seatNumber;
      const theaterIdBefore = db.seats[1].theaterId;

      // when then
      expect(() => service.update(1, { theaterId: 2 })).toThrow(BadRequestException);
      expect(() => service.update(1, { theaterId: 2 })).toThrow('Seat theater id cannot be changed');
      expect(db.seats[1].seatNumber).toBe(seatNumberBefore);
      expect(db.seats[1].theaterId).toBe(theaterIdBefore);
    });

    it('should reject updating an unknown seat', () => {
      // given when then
      expect(() => service.update(999, { seatNumber: 'A1X' })).toThrow(NotFoundException);
      expect(() => service.update(999, { seatNumber: 'A1X' })).toThrow('Seat 999 not found');
    });
  });

  describe('remove', () => {
    function wireBookingsService() {
      return new BookingsService(
        db,
        new UsersService(db),
        new MovieShowingsService(db, new MoviesService(db), new TheatersService(db)),
        new BookedSeatsService(db),
      );
    }

    it('should reject deleting a seat that has a booking on any showing', () => {
      // given
      const bookings = wireBookingsService();
      bookings.create({
        userId: 1,
        movieShowingId: 1,
        bookedSeats: [{ seatId: 1, userId: 1 }],
      });

      // when
      const removeSeat = () => service.remove(1);

      // then
      expect(removeSeat).toThrow(ConflictException);
      expect(removeSeat).toThrow('Seat 1 has bookings and cannot be deleted');
    });

    it('should leave the seat, its booked seats and their booking unchanged after a rejected delete', () => {
      // given
      const bookings = wireBookingsService();
      const booking = bookings.create({
        userId: 1,
        movieShowingId: 1,
        bookedSeats: [{ seatId: 1, userId: 1 }],
      });
      const bookedSeatId = booking.bookedSeats[0].id;
      const seatBefore = { ...db.seats[1] };
      const bookedSeatBefore = { ...db.bookedSeats[bookedSeatId] };
      const bookingBefore = { ...db.bookings[booking.id] };

      // when
      expect(() => service.remove(1)).toThrow(ConflictException);

      // then
      expect(db.seats[1]).toEqual(seatBefore);
      expect(db.bookedSeats[bookedSeatId]).toEqual(bookedSeatBefore);
      expect(db.bookings[booking.id]).toEqual(bookingBefore);
    });

    it('should reject deleting a seat booked on a different showing than the first one checked', () => {
      // given
      const bookings = wireBookingsService();
      const movieShowings = new MovieShowingsService(db, new MoviesService(db), new TheatersService(db));
      const secondShowing = movieShowings.create({
        movieId: 1,
        theaterId: 1,
        startTime: '21:00',
        endTime: '23:00',
        showDate: '2026-09-22',
      });
      bookings.create({
        userId: 1,
        movieShowingId: secondShowing.id,
        bookedSeats: [{ seatId: 1, userId: 1 }],
      });

      // when
      const removeSeat = () => service.remove(1);

      // then
      expect(removeSeat).toThrow(ConflictException);
      expect(removeSeat).toThrow('Seat 1 has bookings and cannot be deleted');
    });

    it('should delete a seat that has no bookings', () => {
      // given when
      const result = service.remove(3);

      // then
      expect(result).toEqual({ message: 'Seat B1 (3) deleted successfully' });
    });

    it('should make a deleted seat 404 on a later read', () => {
      // given
      service.remove(3);

      // when
      const findDeletedSeat = () => service.findOne(3);

      // then
      expect(findDeletedSeat).toThrow(NotFoundException);
      expect(findDeletedSeat).toThrow('Seat 3 not found');
    });
  });
});
