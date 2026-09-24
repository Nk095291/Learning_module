import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Database } from '../database/database.service.js';
import { BookingsService } from './bookings.service.js';
import { UsersService } from '../users/users.service.js';
import { BookedSeatsService } from './booked-seats.service.js';
import { MovieShowingsService } from '../movies/movie-showings.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { TheatersService } from '../theaters/theaters.service.js';

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function dobYearsAgo(years: number, dayOffset = 0): string {
  const now = new Date();
  const year = now.getUTCFullYear() - years;
  const month = now.getUTCMonth();
  let day = now.getUTCDate();
  if (month === 1 && day === 29 && !isLeapYear(year)) {
    day = 28;
  }
  const dob = new Date(Date.UTC(year, month, day + dayOffset));
  return dob.toISOString().slice(0, 10);
}

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
        expect(booking).toMatchObject({
          user: { id: 1, email: 'john@example.com' },
          movieShowing: { id: 1, theaterId: 1 },
        });
        expect(booking.bookedSeats).toEqual([
          expect.objectContaining({ seatId: 1, userId: 1, bookingId: booking.id }),
          expect.objectContaining({ seatId: 2, userId: 2, bookingId: booking.id }),
        ]);
        expect(db.bookings[booking.id]).toMatchObject({
          userId: 1,
          movieShowingId: 1,
        });
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

      it('should reject a second booking of the same seat on the same showing', () => {
        // given
        service.create({
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 2, userId: 1 }],
        });

        // when
        const bookAgain = () =>
          service.create({
            userId: 2,
            movieShowingId: 1,
            bookedSeats: [{ seatId: 2, userId: 2 }],
          });

        // then
        expect(bookAgain).toThrow(BadRequestException);
        expect(bookAgain).toThrow('Selected seats are not available');
        expect(Object.keys(db.bookings)).toHaveLength(1);
        expect(Object.keys(db.bookedSeats)).toHaveLength(1);
      });

      it('should allow booking a different seat on the same showing after another seat was booked', () => {
        // given
        service.create({
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 2, userId: 1 }],
        });

        // when
        const booking = service.create({
          userId: 2,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 2 }],
        });

        // then
        expect(booking.bookedSeats).toEqual([
          expect.objectContaining({ seatId: 1, userId: 2, movieShowingId: 1 }),
        ]);
        expect(Object.keys(db.bookings)).toHaveLength(2);
      });

      it('should allow booking a seat on another showing after it was booked on the first showing', () => {
        // given
        const movieShowingsService = new MovieShowingsService(
          db,
          new MoviesService(db),
          new TheatersService(db),
        );
        movieShowingsService.create({
          movieId: 1,
          theaterId: 1,
          startTime: '21:00',
          endTime: '23:59',
          showDate: '2026-09-22',
        });
        service.create({
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 1 }],
        });

        // when
        const booking = service.create({
          userId: 2,
          movieShowingId: 2,
          bookedSeats: [{ seatId: 1, userId: 2 }],
        });

        // then
        expect(booking.bookedSeats).toEqual([
          expect.objectContaining({ seatId: 1, userId: 2, movieShowingId: 2 }),
        ]);
        expect(Object.keys(db.bookings)).toHaveLength(2);
      });

      it('should throw an error when user failed to meet age rating requirements', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 3, userDOB: dobYearsAgo(5) }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('User must be at least 13 to book this movie');
        expect(Object.keys(db.bookings)).toHaveLength(0);
      });

      it('should reject a booking with an empty bookedSeats list', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('At least one seat must be selected');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking with no bookedSeats property', () => {
        // given
        const dto = { userId: 1, movieShowingId: 1 } as any;

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('At least one seat must be selected');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking that lists the same seatId twice', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [
            { seatId: 1, userId: 1 },
            { seatId: 1, userId: 1 },
          ],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('Each seat can only be selected once');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking with a seatId that does not exist', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 999, userId: 1 }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('Seat 999 does not exist');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking with a seat from a different theater than the showing', () => {
        // given
        db.seats[4] = { id: 4, theaterId: 2, seatNumber: 'A1', row: 'A', col: 1 };
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 4, userId: 1 }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('Seat 4 is not in the theater of this showing');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking for an unknown booking userId', () => {
        // given
        const dto = {
          userId: 999,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 1 }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(NotFoundException);
        expect(createBooking).toThrow('User 999 not found');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking for an unknown movieShowingId', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 999,
          bookedSeats: [{ seatId: 1, userId: 1 }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(NotFoundException);
        expect(createBooking).toThrow('Movie showing 999 not found');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should accept a booking when the viewer turns exactly the age rating today', () => {
        // given
        const dob = dobYearsAgo(13);
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userDOB: dob }],
        };

        // when
        const booking = service.create(dto);

        // then
        expect(booking.bookedSeats).toEqual([
          expect.objectContaining({ seatId: 1, userDOB: dob }),
        ]);
        expect(db.bookings[booking.id]).toBeDefined();
      });

      it('should reject a booking when the viewers 13th birthday is tomorrow', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 2, userDOB: dobYearsAgo(13, 1) }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('User must be at least 13 to book this movie');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking with an unparseable date of birth', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 3, userDOB: 'garbage' }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('Invalid date of birth');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking whose seat references an unknown userId', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 999 }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(NotFoundException);
        expect(createBooking).toThrow('User 999 not found');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should reject a booking whose seat has neither a userId nor a userDOB', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1 }],
        };

        // when
        const createBooking = () => service.create(dto);

        // then
        expect(createBooking).toThrow(BadRequestException);
        expect(createBooking).toThrow('Providing DOB is mandatory for booking');
        expect(Object.keys(db.bookings)).toHaveLength(0);
        expect(Object.keys(db.bookedSeats)).toHaveLength(0);
      });

      it('should ignore a client-supplied id and not overwrite an existing booking', () => {
        // given
        const first = service.create({
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 1 }],
        });
        const dto = {
          userId: 2,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 2, userId: 2 }],
          id: 99,
        } as any;

        // when
        const second = service.create(dto);

        // then
        expect(first.id).toBe(1);
        expect(second.id).toBe(2);
        expect(db.bookings[1]).toMatchObject({ id: 1, userId: 1 });
        expect(db.bookings[2]).toMatchObject({ id: 2, userId: 2 });
      });

      it('should ignore a client-supplied created_at', () => {
        // given
        const suppliedCreatedAt = new Date('2000-01-01');
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 1 }],
          created_at: suppliedCreatedAt,
        } as any;

        // when
        const booking = service.create(dto);

        // then
        expect(booking.created_at).not.toEqual(suppliedCreatedAt);
      });

      it('should store only id, userId, movieShowingId and created_at on the booking record', () => {
        // given
        const dto = {
          userId: 1,
          movieShowingId: 1,
          bookedSeats: [{ seatId: 1, userId: 1 }],
        };

        // when
        const booking = service.create(dto);

        // then
        expect(Object.keys(db.bookings[booking.id]).sort()).toEqual(
          ['created_at', 'id', 'movieShowingId', 'userId'].sort(),
        );
        expect(db.bookings[booking.id]).not.toHaveProperty('bookedSeats');
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
  