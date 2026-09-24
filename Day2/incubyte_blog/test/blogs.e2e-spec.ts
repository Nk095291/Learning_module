import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Blogs (e2e)', () => {
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
    it('should create a blog and attach the author', async () => {
      // given
      const dto = {
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      };

      // when
      const res = await request(app.getHttpServer()).post('/blogs').send(dto);

      // then
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 1,
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
        author: {
          id: 1,
          name: 'John',
          email: 'john@example.com',
          role: 'free',
        },
      });
    });

    it('should throw error if author is not found', async () => {
      // given
      const dto = {
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 999,
      };

      // when
      const res = await request(app.getHttpServer()).post('/blogs').send(dto);

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User 999 not found');

      const blogs = await request(app.getHttpServer()).get('/blogs');
      expect(blogs.body).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('should return all blogs', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer()).get('/blogs');

      // then
      expect(res.status).toBe(200);
      expect(res.body).toEqual([created.body]);
    });
  });

  describe('findOne', () => {
    it('should return a blog by id', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );

      // then
      expect(res.status).toBe(200);
      expect(res.body).toEqual(created.body);
    });

    it('should throw error if blog is not found', async () => {
      // given
      const missingId = 999;

      // when
      const res = await request(app.getHttpServer()).get(`/blogs/${missingId}`);

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Blog ${missingId} not found`);
    });
  });

  describe('update', () => {
    it('should throw error if actor id is not provided in the headers', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer())
        .patch(`/blogs/${created.body.id}`)
        .send({ title: 'Updated' });

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User undefined not found');

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.body.title).toBe('Hello Nest');
    });

    it('should update a blog if actor is the author', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer())
        .patch(`/blogs/${created.body.id}`)
        .set('user-id', '1')
        .send({ title: 'Updated', content: 'New notes' });

      // then
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: created.body.id,
        title: 'Updated',
        content: 'New notes',
        authorId: 1,
      });

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.body.title).toBe('Updated');
    });

    it('should update a blog if actor is an admin', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer())
        .patch(`/blogs/${created.body.id}`)
        .set('user-id', '3')
        .send({ title: 'Admin edit' });

      // then
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Admin edit');
      expect(res.body.authorId).toBe(1);

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.body.title).toBe('Admin edit');
    });

    it('should throw error if actor is not the author or an admin', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer())
        .patch(`/blogs/${created.body.id}`)
        .set('user-id', '2')
        .send({ title: 'Nope' });

      // then
      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        `User 2 cannot update blog ${created.body.id}`,
      );

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.body.title).toBe('Hello Nest');
    });

    it('should throw error if author is not found', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer())
        .patch(`/blogs/${created.body.id}`)
        .set('user-id', '1')
        .send({ authorId: 999 });

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User 999 not found');

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.body.authorId).toBe(1);
    });
  });

  describe('remove', () => {
    it('should throw error if actor id is not provided in the headers', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer()).delete(
        `/blogs/${created.body.id}`,
      );

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User undefined not found');

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.body.title).toBe('Hello Nest');
    });

    it('should throw error if actor is not found', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });
      const actorId = 999;

      // when
      const res = await request(app.getHttpServer())
        .delete(`/blogs/${created.body.id}`)
        .set('user-id', String(actorId));

      // then
      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`User ${actorId} not found`);

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.body.title).toBe('Hello Nest');
    });

    it('should remove a blog if actor is the author', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer())
        .delete(`/blogs/${created.body.id}`)
        .set('user-id', '1');

      // then
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: `Blog ${created.body.title} (${created.body.id}) deleted successfully`,
      });

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.status).toBe(404);
    });

    it('should remove a blog if actor is an admin', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer())
        .delete(`/blogs/${created.body.id}`)
        .set('user-id', '3');

      // then
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: `Blog ${created.body.title} (${created.body.id}) deleted successfully`,
      });

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.status).toBe(404);
    });

    it('should throw error if actor is not the author or an admin', async () => {
      // given
      const created = await request(app.getHttpServer()).post('/blogs').send({
        title: 'Hello Nest',
        content: 'Testing notes',
        authorId: 1,
      });

      // when
      const res = await request(app.getHttpServer())
        .delete(`/blogs/${created.body.id}`)
        .set('user-id', '2');

      // then
      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        `User 2 cannot delete blog ${created.body.id}`,
      );

      const blog = await request(app.getHttpServer()).get(
        `/blogs/${created.body.id}`,
      );
      expect(blog.body.title).toBe('Hello Nest');
    });
  });
});
