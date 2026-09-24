import { Database } from '../database/database.service.js';
import { BookedSeatsService } from './booked-seats.service.js';

describe('BookedSeatsService', () => {
  let db: Database;
  let service: BookedSeatsService;

  beforeEach(() => {
    db = new Database();
    service = new BookedSeatsService(db);
  });

  describe('create', () => {
    it('should ignore a client-supplied id in the dto', () => {
      // given
      const dto = { seatId: 1, userId: 1, id: 99 } as any;

      // when
      const bookedSeat = service.create(dto, 1, 1);

      // then
      expect(bookedSeat.id).toBe(1);
      expect(db.bookedSeats[1]).toMatchObject({ id: 1, seatId: 1 });
    });

    it('should ignore a client-supplied created_at in the dto', () => {
      // given
      const suppliedCreatedAt = new Date('2000-01-01');
      const dto = { seatId: 1, userId: 1, created_at: suppliedCreatedAt } as any;

      // when
      const bookedSeat = service.create(dto, 1, 1);

      // then
      expect(bookedSeat.created_at).not.toEqual(suppliedCreatedAt);
    });
  });
});
