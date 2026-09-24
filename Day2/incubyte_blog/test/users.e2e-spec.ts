import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('create', () => {
    it('should create a user with a default role and auto-generated id', async () => {
      // given
      const dto = { name: 'Grace', email: 'grace@example.com' };

      // when
      const res = await request(app.getHttpServer()).post('/users').send(dto);

      // then
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 4,
        name: 'Grace',
        email: 'grace@example.com',
        role: 'free',
      });
    });

    it('should not create with role other than free', async () => {
      // given
      const drafts = [
        { name: 'Grace', email: 'grace@example.com', role: 'premium' },
        { name: 'Ada Lovelace', email: 'ada.lovelace@example.com', role: 'admin' },
      ];

      // when
      const responses = [];
      for (const dto of drafts) {
        responses.push(
          await request(app.getHttpServer()).post('/users').send(dto),
        );
      }

      // then
      for (const res of responses) {
        expect(res.status).toBe(201);
        expect(res.body.role).toBe('free');
      }
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // given
      const created = await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Grace', email: 'grace@example.com' });

      // when
      const res = await request(app.getHttpServer()).get('/users');

      // then
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(4);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'John', role: 'free' }),
          created.body,
        ]),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      // given
      const userId = 1;

      // when
      const res = await request(app.getHttpServer()).get(`/users/${userId}`);

      // then
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 1,
        name: 'John',
        email: 'john@example.com',
        role: 'free',
      });
    });

    it('should throw an error if user not found', async () => {
      // given
      const missingId = 999;

      // when
      const res = await request(app.getHttpServer()).get(`/users/${missingId}`);

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`User ${missingId} not found`);
    });
  });

  describe('update', () => {
    it('should throw error if actor id is not provided in the headers', async () => {
      // given
      const userId = 1;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send({ name: 'Johnny' });

      // then
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid actor id');

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body.name).toBe('John');
    });

    it('should throw error if actor is not found', async () => {
      // given
      const userId = 1;
      const actorId = 999;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('user-id', String(actorId))
        .send({ name: 'Johnny' });

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`User ${actorId} not found`);

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body.name).toBe('John');
    });

    it('should throw error if user is not found', async () => {
      // given
      const actorId = 3;
      const missingUserId = 999;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${missingUserId}`)
        .set('user-id', String(actorId))
        .send({ name: 'Johnny' });

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`User ${missingUserId} not found`);
    });

    it('should throw error if actor tries to update role and actor is not an admin', async () => {
      // given
      const actorId = 1;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${actorId}`)
        .set('user-id', String(actorId))
        .send({ role: 'premium' });

      // then
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot update role of the user');

      const user = await request(app.getHttpServer()).get(`/users/${actorId}`);
      expect(user.body.role).toBe('free');
    });

    it('should update role if actor is an admin', async () => {
      // given
      const actorId = 3;
      const userId = 1;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('user-id', String(actorId))
        .send({ role: 'premium' });

      // then
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('premium');

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body.role).toBe('premium');
    });

    it('should throw error if actor tries to update user other than itself and actor is not an admin', async () => {
      // given
      const actorId = 1;
      const userId = 2;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('user-id', String(actorId))
        .send({ name: 'Janet' });

      // then
      expect(res.status).toBe(401);
      expect(res.body.message).toBe(
        `User ${actorId} cannot update user ${userId}`,
      );

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body.name).toBe('Jane');
    });

    it('should update user if actor is an admin', async () => {
      // given
      const actorId = 3;
      const userId = 2;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('user-id', String(actorId))
        .send({ name: 'Janet', email: 'janet@example.com' });

      // then
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: userId,
        name: 'Janet',
        email: 'janet@example.com',
        role: 'premium',
      });

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body).toEqual(res.body);
    });

    it('should update user if actor tries to update itself', async () => {
      // given
      const actorId = 1;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${actorId}`)
        .set('user-id', String(actorId))
        .send({ name: 'Johnny', email: 'johnny@example.com' });

      // then
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: actorId,
        name: 'Johnny',
        email: 'johnny@example.com',
        role: 'free',
      });

      const user = await request(app.getHttpServer()).get(`/users/${actorId}`);
      expect(user.body).toEqual(res.body);
    });

    it('should throw error if actor tries to update its own role', async () => {
      // given
      const actorId = 1;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${actorId}`)
        .set('user-id', String(actorId))
        .send({
          name: 'Johnny',
          email: 'johnny@example.com',
          role: 'admin',
        });

      // then
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot update role of the user');

      const user = await request(app.getHttpServer()).get(`/users/${actorId}`);
      expect(user.body.role).toBe('free');
    });

    it('should throw error if actor tries to update user role to invalid role', async () => {
      // given
      const actorId = 3;
      const userId = 1;

      // when
      const res = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('user-id', String(actorId))
        .send({ role: 'guest' });

      // then
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid role');

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body.role).toBe('free');
    });
  });

  describe('delete', () => {
    it('should throw error if actor id is not provided in the headers', async () => {
      // given
      const userId = 1;

      // when
      const res = await request(app.getHttpServer()).delete(`/users/${userId}`);

      // then
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid actor id');

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body.name).toBe('John');
    });

    it('should throw error if actor is not found', async () => {
      // given
      const userId = 1;
      const actorId = 999;

      // when
      const res = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('user-id', String(actorId));

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`User ${actorId} not found`);

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body.name).toBe('John');
    });

    it('should throw error if user is not found', async () => {
      // given
      const actorId = 3;
      const missingUserId = 999;

      // when
      const res = await request(app.getHttpServer())
        .delete(`/users/${missingUserId}`)
        .set('user-id', String(actorId));

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`User ${missingUserId} not found`);
    });

    it('should throw error if actor tries to delete user other than itself and actor is not an admin', async () => {
      // given
      const actorId = 1;
      const userId = 2;

      // when
      const res = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('user-id', String(actorId));

      // then
      expect(res.status).toBe(401);
      expect(res.body.message).toBe(
        `User ${actorId} cannot delete user ${userId}`,
      );

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.body.name).toBe('Jane');
    });

    it('should delete user if actor is an admin', async () => {
      // given
      const actorId = 3;
      const userId = 1;

      // when
      const res = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('user-id', String(actorId));

      // then
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'User John (1) deleted successfully',
      });

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      expect(user.status).toBe(404);
    });

    it('should delete user if actor tries to delete itself', async () => {
      // given
      const actorId = 1;

      // when
      const res = await request(app.getHttpServer())
        .delete(`/users/${actorId}`)
        .set('user-id', String(actorId));

      // then
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'User John (1) deleted successfully',
      });

      const user = await request(app.getHttpServer()).get(`/users/${actorId}`);
      expect(user.status).toBe(404);
    });

    it('should delete user and all blogs associated with the user', async () => {
      // given
      const userId = 1;
      const first = await request(app.getHttpServer()).post('/blogs').send({
        title: 'First',
        content: 'John wrote this',
        authorId: userId,
      });
      const second = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Second',
        content: 'John wrote this too',
        authorId: userId,
      });

      // when
      const res = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('user-id', String(userId));

      // then
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'User John (1) deleted successfully',
      });

      const user = await request(app.getHttpServer()).get(`/users/${userId}`);
      const blogs = await request(app.getHttpServer()).get('/blogs');
      const firstBlog = await request(app.getHttpServer()).get(
        `/blogs/${first.body.id}`,
      );
      const secondBlog = await request(app.getHttpServer()).get(
        `/blogs/${second.body.id}`,
      );

      expect(user.status).toBe(404);
      expect(firstBlog.status).toBe(404);
      expect(secondBlog.status).toBe(404);
      expect(blogs.body).toHaveLength(0);
    });
  });
});
