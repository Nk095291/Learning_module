import { Database } from '../database/database.service.js';
import { TheatersService } from './theaters.service.js';

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
});
