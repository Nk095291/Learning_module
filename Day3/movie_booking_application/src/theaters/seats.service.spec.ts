import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Database } from '../database/database.service.js';
import { SeatsService } from './seats.service.js';
import { TheatersService } from './theaters.service.js';

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
});
