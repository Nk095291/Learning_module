import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { Database } from '../database/database.service.js';
import { userFactory } from './factories/user.factory.js';

describe('UsersService', () => {
  let db: Database;
  let service: UsersService;

  beforeEach(() => {
    db = new Database();
    service = new UsersService(db);
  });

  describe('create', () => {
    it('should persist a user with an auto-generated id', () => {
      const { id, ...dto } = userFactory.build({ name: 'Grace', role: 'admin' });

      const user = service.create(dto);

      expect(user).toMatchObject({ id: 4, ...dto });
      expect(service.findAll()).toContainEqual(user);
    });
  });

  describe('findAll', () => {
    it('should return the seeded users', () => {
      expect(service.findAll()).toHaveLength(3);
    });
  });

  describe('findOne', () => {
    it('should return the matching user', () => {
      expect(service.findOne(1)).toMatchObject({
        id: 1,
        name: 'John',
        role: 'free',
      });
    });

    it('should throw NotFoundException for an unknown id', () => {
      expect(() => service.findOne(999)).toThrow(NotFoundException);
      expect(() => service.findOne(999)).toThrow('User 999 not found');
    });
  });

  describe('update', () => {
    it('should patch an existing user', () => {
      const updated = service.update(1, { name: 'Johnny' });

      expect(updated.name).toBe('Johnny');
      expect(updated.email).toBe('john@example.com');
    });

    it('should throw NotFoundException when updating an unknown id', () => {
      expect(() => service.update(999, { name: 'Nope' })).toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an existing user', () => {
      const result = service.remove(1);

      expect(result).toEqual({ message: 'User 1 deleted successfully' });
      expect(() => service.findOne(1)).toThrow(NotFoundException);
    });

    it('should throw NotFoundException when deleting an unknown id', () => {
      expect(() => service.remove(999)).toThrow(NotFoundException);
    });
  });
});