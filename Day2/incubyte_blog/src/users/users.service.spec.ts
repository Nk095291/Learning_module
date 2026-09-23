import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { Database } from '../database/database.service.js';
import { userFactory } from './factories/user.factory.js';
import { UserRoleName } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';

describe('UsersService', () => {
  let db: Database;
  let service: UsersService;

  beforeEach(() => {
    db = new Database();
    service = new UsersService(db);
  });

  describe('create', () => {
    it('should create a user with a default role and auto-generated id', () => {
      // given
      const draft = userFactory.build();

      // when
      const user = service.create({
        name: draft.name,
        email: draft.email,
      });

      // then
      expect(user).toEqual({
        id: 4,
        name: draft.name,
        email: draft.email,
        role: 'free',
      });
      expect(db.users[user.id]).toEqual(user);
    });

    it('should not create with role other than free', () => {
      // given
      const draft = userFactory.build({
        role: 'premium',
      });

      const draft2 = userFactory.build({
        role: 'admin',
      });

      // when
      for (const user_draft of [draft, draft2]) {
        const user = service.create({
          name: user_draft.name,
          email: user_draft.email,
          role: user_draft.role,
        } as CreateUserDto);

        // then
        expect(user.role).toBe('free');
        expect(db.users[user.id].role).toBe('free');
      }
    });
  });

  describe('findAll', () => {
    it('should return all users', () => {
      // given
      const created = service.create(userFactory.build());

      // when
      const users = service.findAll();

      // then
      expect(users).toHaveLength(4);
      expect(users).toContainEqual(db.users[1]);
      expect(users).toContainEqual(created);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', () => {
      // given
      const expected = db.users[1];

      // when
      const user = service.findOne(expected.id);

      // then
      expect(user).toEqual(expected);
    });

    it('should throw an error if user not found', () => {
      // given
      const missingId = 999;

      // when
      const findUser = () => service.findOne(missingId);

      // then
      expect(findUser).toThrow(NotFoundException);
      expect(findUser).toThrow(`User ${missingId} not found`);
    });
  });

  describe('update', () => {
    it('should throw error if actor id is not provided in the headers', () => {
      // given
      const user = service.findOne(1);
      const actorId = Number(undefined);

      // when
      const updateUser = () =>
        service.update(user.id, { name: 'Johnny' }, actorId);

      // then
      expect(updateUser).toThrow(BadRequestException);
      expect(updateUser).toThrow('Invalid actor id');
      expect(service.findOne(user.id).name).toBe('John');
    });

    it('should throw error if actor is not found', () => {
      // given
      const user = service.findOne(1);
      const actorId = 999;

      // when
      const updateUser = () =>
        service.update(user.id, { name: 'Johnny' }, actorId);

      // then
      expect(updateUser).toThrow(NotFoundException);
      expect(updateUser).toThrow(`User ${actorId} not found`);
      expect(service.findOne(user.id).name).toBe('John');
    });

    it('should throw error if user is not found', () => {
      // given
      const actor = service.findOne(3);
      const missingUserId = 999;

      // when
      const updateUser = () =>
        service.update(missingUserId, { name: 'Johnny' }, actor.id);

      // then
      expect(updateUser).toThrow(NotFoundException);
      expect(updateUser).toThrow(`User ${missingUserId} not found`);
    });

    it('should throw error if actor tries to update role and actor is not an admin', () => {
      // given
      const actor = service.findOne(1);

      // when
      const updateUser = () =>
        service.update(actor.id, { role: 'premium' }, actor.id);

      // then
      expect(updateUser).toThrow(BadRequestException);
      expect(updateUser).toThrow('Cannot update role of the user');
      expect(service.findOne(actor.id).role).toBe('free');
    });

    it('should update role if actor is an admin', () => {
      // given
      const actor = service.findOne(3);
      const user = service.findOne(1);

      // when
      const updated = service.update(user.id, { role: 'premium' }, actor.id);

      // then
      expect(updated.role).toBe('premium');
      expect(service.findOne(user.id).role).toBe('premium');
    });

    it('should throw error if actor tries to update user other than itself and actor is not an admin', () => {
      // given
      const actor = service.findOne(1);
      const user = service.findOne(2);

      // when
      const updateUser = () =>
        service.update(user.id, { name: 'Janet' }, actor.id);

      // then
      expect(updateUser).toThrow(UnauthorizedException);
      expect(updateUser).toThrow(
        `User ${actor.id} cannot update user ${user.id}`,
      );
      expect(service.findOne(user.id).name).toBe('Jane');
    });

    it('should update user if actor is an admin', () => {
      // given
      const actor = service.findOne(3);
      const user = service.findOne(2);

      // when
      const updated = service.update(
        user.id,
        { name: 'Janet', email: 'janet@example.com' },
        actor.id,
      );

      // then
      expect(updated).toMatchObject({
        id: user.id,
        name: 'Janet',
        email: 'janet@example.com',
        role: 'premium',
      });
      expect(service.findOne(user.id)).toEqual(updated);
    });

    it('should update user if actor tries to update itself', () => {
      // given
      const actor = service.findOne(1);

      // when
      const updated = service.update(
        actor.id,
        { name: 'Johnny', email: 'johnny@example.com' },
        actor.id,
      );

      // then
      expect(updated).toMatchObject({
        id: actor.id,
        name: 'Johnny',
        email: 'johnny@example.com',
        role: 'free',
      });
      expect(service.findOne(actor.id)).toEqual(updated);
    });
    
    it('should throw error if actor tries to update its own role', () => {
      // given
      const actor = service.findOne(1);

      // when
      const updateUser = () => service.update(
        actor.id,
        { name: 'Johnny', email: 'johnny@example.com' , role : 'admin'},
        actor.id,
      );

      // then
      expect(updateUser).toThrow(BadRequestException);
      expect(updateUser).toThrow('Cannot update role of the user');
      expect(service.findOne(actor.id).role).toBe('free');
    });

    it('should throw error if actor tries to update user role to invalid role', () => {
      // given
      const actor = service.findOne(3);
      const user = service.findOne(1);
      const invalidRole = 'guest' as UserRoleName;

      // when
      const updateUser = () =>
        service.update(user.id, { role: invalidRole }, actor.id);

      // then
      expect(updateUser).toThrow(BadRequestException);
      expect(updateUser).toThrow('Invalid role');
      expect(service.findOne(user.id).role).toBe('free');
    });
  });

  describe('delete', () => {
    const remove = (id: number, actorId: number) => {
      const removeUser = service.remove as (
        id: number,
        actorId: number,
      ) => ReturnType<UsersService['remove']>;

      return removeUser.call(service, id, actorId);
    };

    it('should throw error if actor id is not provided in the headers', () => {
      // given
      const user = service.findOne(1);
      const actorId = Number(undefined);

      // when
      const deleteUser = () => remove(user.id, actorId);

      // then
      expect(deleteUser).toThrow(BadRequestException);
      expect(deleteUser).toThrow('Invalid actor id');
      expect(service.findOne(user.id).name).toBe('John');
    });

    it('should throw error if actor is not found', () => {
      // given
      const user = service.findOne(1);
      const actorId = 999;

      // when
      const deleteUser = () => remove(user.id, actorId);

      // then
      expect(deleteUser).toThrow(NotFoundException);
      expect(deleteUser).toThrow(`User ${actorId} not found`);
      expect(service.findOne(user.id).name).toBe('John');
    });

    it('should throw error if user is not found', () => {
      // given
      const actor = service.findOne(3);
      const missingUserId = 999;

      // when
      const deleteUser = () => remove(missingUserId, actor.id);

      // then
      expect(deleteUser).toThrow(NotFoundException);
      expect(deleteUser).toThrow(`User ${missingUserId} not found`);
    });

    it('should throw error if actor tries to delete user other than itself and actor is not an admin', () => {
      // given
      const actor = service.findOne(1);
      const user = service.findOne(2);

      // when
      const deleteUser = () => remove(user.id, actor.id);

      // then
      expect(deleteUser).toThrow(UnauthorizedException);
      expect(deleteUser).toThrow(
        `User ${actor.id} cannot delete user ${user.id}`,
      );
      expect(service.findOne(user.id).name).toBe('Jane');
    });

    it('should delete user if actor is an admin', () => {
      // given
      const actor = service.findOne(3);
      const user = service.findOne(1);

      // when
      const result = remove(user.id, actor.id);

      // then
      expect(result).toEqual({
        message: `User ${user.name} (${user.id}) deleted successfully`,
      });
      expect(() => service.findOne(user.id)).toThrow(NotFoundException);
    });

    it('should delete user if actor tries to delete itself', () => {
      // given
      const actor = service.findOne(1);

      // when
      const result = remove(actor.id, actor.id);

      // then
      expect(result).toEqual({
        message: `User ${actor.name} (${actor.id}) deleted successfully`,
      });
      expect(() => service.findOne(actor.id)).toThrow(NotFoundException);
    });
  });
});
