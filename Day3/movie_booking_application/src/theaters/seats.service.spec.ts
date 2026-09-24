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
});
