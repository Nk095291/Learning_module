import { Database } from '../database/database.service.js';
import { UsersService } from './users.service.js';

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
});
