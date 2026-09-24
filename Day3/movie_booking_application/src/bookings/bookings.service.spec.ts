import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Database } from '../database/database.service.js';
import { BookingsService } from './bookings.service.js';
import { UsersService } from '../users/users.service.js';
import { BookedSeatsService } from './booked-seats.service.js';
import { MovieShowingsService } from '../movies/movie-showings.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { TheatersService } from '../theaters/theaters.service.js';

  describe('BookingsService', () => {
    let db: Database;
    let service: BookingsService;

  
    beforeEach(() => {
      db = new Database();
      service = new BookingsService(db, new UsersService(db), new MovieShowingsService(db, new MoviesService(db), new TheatersService(db)), new BookedSeatsService(db));
    });
  
    describe('create', () => {
      it('should create a booking when user id is provided', () => {
        // given when
        const booking = service.create({
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 1 }],
        });

        // then
        expect(booking).toMatchObject({
          id: 1,
          userId: 1,
          movieShowingId: 1,
          user: { id: 1, email: 'john@example.com' },
          movieShowing: { id: 1, movieId: 1, theaterId: 1 },
        });
        expect(booking.bookedSeats).toEqual([
          expect.objectContaining({
            id: 1,
            seatId: 1,
            userId: 1,
            bookingId: 1,
            movieShowingId: 1,
          }),
        ]);
        expect(booking.created_at).toBeInstanceOf(Date);
        expect(db.bookings[booking.id]).toMatchObject({
          id: 1,
          userId: 1,
          movieShowingId: 1,
        });
        expect(db.bookedSeats[1]).toMatchObject({
          id: 1,
          seatId: 1,
          userId: 1,
          bookingId: 1,
          movieShowingId: 1,
        });
      });


      it('should create a booking when user dob is provided', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 2, userDOB: '1995-01-01' }],
        };

        // when
        const booking = service.create(dto);

        // then
        expect(booking.bookedSeats).toEqual([
          expect.objectContaining({
            seatId: 2,
            userDOB: '1995-01-01',
            bookingId: booking.id,
            movieShowingId: 1,
          }),
        ]);
        expect(booking.bookedSeats[0].userId).toBeUndefined();
        expect(db.bookedSeats[booking.bookedSeats[0].id]).toMatchObject({
          id: booking.bookedSeats[0].id,
          seatId: 2,
          userDOB: '1995-01-01',
          bookingId: booking.id, 
          movieShowingId: booking.movieShowingId,
        });
      });


      it('should create a booking when multiple seats are provided', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [
            { seatId: 1, userId: 1 },
            { seatId: 2, userId: 2 },
          ],
        };

        // when
        const booking = service.create(dto);

        // then
        expect(booking.bookedSeats).toEqual([
          expect.objectContaining({ seatId: 1, userId: 1, bookingId: booking.id }),
          expect.objectContaining({ seatId: 2, userId: 2, bookingId: booking.id }),
        ]);
        expect(db.bookings[booking.id]).toBeDefined();
        expect(db.bookedSeats[booking.bookedSeats[0].id]).toMatchObject({
          id: booking.bookedSeats[0].id,
          seatId: 1,
          userId: 1,
          bookingId: booking.id,
          movieShowingId: booking.movieShowingId,
        });
        expect(db.bookedSeats[booking.bookedSeats[1].id]).toMatchObject({
          id: booking.bookedSeats[1].id,
          seatId: 2,
          userId: 2,
          bookingId: booking.id,
          movieShowingId: booking.movieShowingId,
        });
        expect(Object.keys(db.bookedSeats)).toHaveLength(2);
      });


      it('should throw an error when trying to book a seat that is already booked', () => {
        // given
        service.create({
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 1 }],
        });

        // when
        const bookAgain = () =>
          service.create({
            userId: 2,
            movieShowingId: 1,
            bookedSeats: [{ seatId: 1, userId: 2 }],
          });

        // then
        expect(bookAgain).toThrow(BadRequestException);
        expect(bookAgain).toThrow('Selected seats are not available');
        expect(Object.keys(db.bookings)).toHaveLength(1);
      });

      it('should throw an error when user failed to meet age rating requirements', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 3, userDOB: '2020-01-01' }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('User must be at least 13 to book this movie');
        expect(Object.keys(db.bookings)).toHaveLength(0);
      });


    });
    

    describe('FindAll', () => {
        it('should return all bookings with their booked seats, user and movie showing', () => {
          // given
          const first = service.create({
            userId: 1,
            movieShowingId: 1,
            bookedSeats: [{ seatId: 1, userId: 1 }],
          });
          const second = service.create({
            userId: 2,
            movieShowingId: 1,
            bookedSeats: [{ seatId: 2, userId: 2 }],
          });

          // when
          const bookings = service.findAll();

          // then
          expect(bookings).toHaveLength(2);
          expect(bookings).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: first.id,
                user: expect.objectContaining({ id: 1, email: 'john@example.com' }),
                movieShowing: expect.objectContaining({ id: 1, movieId: 1 }),
                bookedSeats: [
                  expect.objectContaining({ seatId: 1, bookingId: first.id }),
                ],
              }),
              expect.objectContaining({
                id: second.id,
                user: expect.objectContaining({ id: 2, email: 'jane@example.com' }),
                movieShowing: expect.objectContaining({ id: 1, movieId: 1 }),
                bookedSeats: [
                  expect.objectContaining({ seatId: 2, bookingId: second.id }),
                ],
              }),
            ]),
          );
        });
      });

    
    describe('findOne', () => {
        it('should return a booking with its booked seats, user and movie showing', () => {
          // given
          const created = service.create({
            userId: 1,
            movieShowingId: 1,
            bookedSeats: [{ seatId: 1, userId: 1 }],
          });

          // when
          const booking = service.findOne(created.id);

          // then
          expect(booking).toMatchObject({
            id: created.id,
            userId: 1,
            movieShowingId: 1,
            user: { id: 1, email: 'john@example.com' },
            movieShowing: { id: 1, movieId: 1, theaterId: 1 },
          });
          expect(booking.bookedSeats).toEqual([
            expect.objectContaining({
              seatId: 1,
              userId: 1,
              bookingId: created.id,
              movieShowingId: 1,
            }),
          ]);
        });

        it('should throw an error when booking is not found', () => {
          // given
          const missingId = 999;

          // when
          const findBooking = () => service.findOne(missingId);

          // then
          expect(findBooking).toThrow(NotFoundException);
          expect(findBooking).toThrow(`Booking ${missingId} not found`);
        });
      });

});
  