import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { Database } from '../database/database.service.js';
import { userFactory } from './factories/user.factory.js';
import { UserRoleName } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { BlogsService } from '../blogs/blogs.service.js';
import { blogFactory } from '../blogs/factories/blog.factory.js';

describe('UsersController', () => {
  let db: Database;
  let blogsService: BlogsService;
  let controller: UsersController;

  beforeEach(() => {
    db = new Database();
    const usersService = new UsersService(db);
    blogsService = new BlogsService(db, usersService);
    controller = new UsersController(usersService);
  });

  describe('create', () => {
    it('should create a user with a default role and auto-generated id', () => {
      // given
      const draft = userFactory.build();

      // when
      const user = controller.create({
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
      const drafts = [
        userFactory.build({ role: 'premium' }),
        userFactory.build({ role: 'admin' }),
      ];

      // when
      const users = drafts.map((draft) =>
        controller.create({
          name: draft.name,
          email: draft.email,
          role: draft.role,
        } as CreateUserDto),
      );

      // then
      for (const user of users) {
        expect(user.role).toBe('free');
        expect(db.users[user.id].role).toBe('free');
      }
    });
  });

  describe('findAll', () => {
    it('should return all users', () => {
      // given
      const draft = userFactory.build();
      const created = controller.create({
        name: draft.name,
        email: draft.email,
      });

      // when
      const users = controller.findAll();

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
      const user = controller.findOne(String(expected.id));

      // then
      expect(user).toEqual(expected);
    });

    it('should throw an error if user not found', () => {
      // given
      const missingId = '999';

      // when
      const findUser = () => controller.findOne(missingId);

      // then
      expect(findUser).toThrow(NotFoundException);
      expect(findUser).toThrow(`User ${missingId} not found`);
    });
  });

  describe('update', () => {
    it('should throw error if actor id is not provided in the headers', () => {
      // given
      const user = controller.findOne('1');
      const actorId = Number(undefined);

      // when
      const updateUser = () =>
        controller.update(String(user.id), { name: 'Johnny' }, actorId);

      // then
      expect(updateUser).toThrow(BadRequestException);
      expect(updateUser).toThrow('Invalid actor id');
      expect(controller.findOne(String(user.id)).name).toBe('John');
    });

    it('should throw error if actor is not found', () => {
      // given
      const user = controller.findOne('1');
      const actorId = 999;

      // when
      const updateUser = () =>
        controller.update(String(user.id), { name: 'Johnny' }, actorId);

      // then
      expect(updateUser).toThrow(NotFoundException);
      expect(updateUser).toThrow(`User ${actorId} not found`);
      expect(controller.findOne(String(user.id)).name).toBe('John');
    });

    it('should throw error if user is not found', () => {
      // given
      const actor = controller.findOne('3');
      const missingUserId = '999';

      // when
      const updateUser = () =>
        controller.update(missingUserId, { name: 'Johnny' }, actor.id);

      // then
      expect(updateUser).toThrow(NotFoundException);
      expect(updateUser).toThrow(`User ${missingUserId} not found`);
    });

    it('should throw error if actor tries to update role and actor is not an admin', () => {
      // given
      const actor = controller.findOne('1');

      // when
      const updateUser = () =>
        controller.update(String(actor.id), { role: 'premium' }, actor.id);

      // then
      expect(updateUser).toThrow(BadRequestException);
      expect(updateUser).toThrow('Cannot update role of the user');
      expect(controller.findOne(String(actor.id)).role).toBe('free');
    });

    it('should update role if actor is an admin', () => {
      // given
      const actor = controller.findOne('3');
      const user = controller.findOne('1');

      // when
      const updated = controller.update(
        String(user.id),
        { role: 'premium' },
        actor.id,
      );

      // then
      expect(updated.role).toBe('premium');
      expect(controller.findOne(String(user.id)).role).toBe('premium');
    });

    it('should throw error if actor tries to update user other than itself and actor is not an admin', () => {
      // given
      const actor = controller.findOne('1');
      const user = controller.findOne('2');

      // when
      const updateUser = () =>
        controller.update(String(user.id), { name: 'Janet' }, actor.id);

      // then
      expect(updateUser).toThrow(UnauthorizedException);
      expect(updateUser).toThrow(
        `User ${actor.id} cannot update user ${user.id}`,
      );
      expect(controller.findOne(String(user.id)).name).toBe('Jane');
    });

    it('should update user if actor is an admin', () => {
      // given
      const actor = controller.findOne('3');
      const user = controller.findOne('2');

      // when
      const updated = controller.update(
        String(user.id),
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
      expect(controller.findOne(String(user.id))).toEqual(updated);
    });

    it('should update user if actor tries to update itself', () => {
      // given
      const actor = controller.findOne('1');

      // when
      const updated = controller.update(
        String(actor.id),
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
      expect(controller.findOne(String(actor.id))).toEqual(updated);
    });

    it('should throw error if actor tries to update its own role', () => {
      // given
      const actor = controller.findOne('1');

      // when
      const updateUser = () =>
        controller.update(
          String(actor.id),
          { name: 'Johnny', email: 'johnny@example.com', role: 'admin' },
          actor.id,
        );

      // then
      expect(updateUser).toThrow(BadRequestException);
      expect(updateUser).toThrow('Cannot update role of the user');
      expect(controller.findOne(String(actor.id)).role).toBe('free');
    });

    it('should throw error if actor tries to update user role to invalid role', () => {
      // given
      const actor = controller.findOne('3');
      const user = controller.findOne('1');
      const invalidRole = 'guest' as UserRoleName;

      // when
      const updateUser = () =>
        controller.update(String(user.id), { role: invalidRole }, actor.id);

      // then
      expect(updateUser).toThrow(BadRequestException);
      expect(updateUser).toThrow('Invalid role');
      expect(controller.findOne(String(user.id)).role).toBe('free');
    });
  });

  describe('delete', () => {
    it('should throw error if actor id is not provided in the headers', () => {
      // given
      const user = controller.findOne('1');
      const actorId = Number(undefined);

      // when
      const deleteUser = () => controller.remove(String(user.id), actorId);

      // then
      expect(deleteUser).toThrow(BadRequestException);
      expect(deleteUser).toThrow('Invalid actor id');
      expect(controller.findOne(String(user.id)).name).toBe('John');
    });

    it('should throw error if actor is not found', () => {
      // given
      const user = controller.findOne('1');
      const actorId = 999;

      // when
      const deleteUser = () => controller.remove(String(user.id), actorId);

      // then
      expect(deleteUser).toThrow(NotFoundException);
      expect(deleteUser).toThrow(`User ${actorId} not found`);
      expect(controller.findOne(String(user.id)).name).toBe('John');
    });

    it('should throw error if user is not found', () => {
      // given
      const actor = controller.findOne('3');
      const missingUserId = '999';

      // when
      const deleteUser = () => controller.remove(missingUserId, actor.id);

      // then
      expect(deleteUser).toThrow(NotFoundException);
      expect(deleteUser).toThrow(`User ${missingUserId} not found`);
    });

    it('should throw error if actor tries to delete user other than itself and actor is not an admin', () => {
      // given
      const actor = controller.findOne('1');
      const user = controller.findOne('2');

      // when
      const deleteUser = () => controller.remove(String(user.id), actor.id);

      // then
      expect(deleteUser).toThrow(UnauthorizedException);
      expect(deleteUser).toThrow(
        `User ${actor.id} cannot delete user ${user.id}`,
      );
      expect(controller.findOne(String(user.id)).name).toBe('Jane');
    });

    it('should delete user if actor is an admin', () => {
      // given
      const actor = controller.findOne('3');
      const user = controller.findOne('1');

      // when
      const result = controller.remove(String(user.id), actor.id);

      // then
      expect(result).toEqual({
        message: `User ${user.name} (${user.id}) deleted successfully`,
      });
      expect(() => controller.findOne(String(user.id))).toThrow(
        NotFoundException,
      );
    });

    it('should delete user if actor tries to delete itself', () => {
      // given
      const actor = controller.findOne('1');

      // when
      const result = controller.remove(String(actor.id), actor.id);

      // then
      expect(result).toEqual({
        message: `User ${actor.name} (${actor.id}) deleted successfully`,
      });
      expect(() => controller.findOne(String(actor.id))).toThrow(
        NotFoundException,
      );
    });

    it('should delete user and all blogs associated with the user', () => {
      // given
      const user = controller.findOne('1');
      const { id, author, ...dto } = blogFactory.build({ author: user });
      const { id: id2, author: author2, ...dto2 } = blogFactory.build({
        author: user,
      });
      const blog = blogsService.create(dto);
      const blog2 = blogsService.create(dto2);

      // when
      const result = controller.remove(String(user.id), user.id);

      // then
      expect(result).toEqual({
        message: `User ${user.name} (${user.id}) deleted successfully`,
      });
      expect(() => controller.findOne(String(user.id))).toThrow(
        NotFoundException,
      );
      expect(() => blogsService.findOne(blog.id)).toThrow(NotFoundException);
      expect(() => blogsService.findOne(blog2.id)).toThrow(NotFoundException);
      expect(Object.keys(db.blogs)).toHaveLength(0);
    });
  });
});
