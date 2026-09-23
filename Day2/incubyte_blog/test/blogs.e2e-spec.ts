import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { blogFactory } from '../src/blogs/factories/blog.factory.js';

describe('Blogs (e2e)', () => {
  let app: INestApplication<App>;

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

  it('POST /blogs then GET /blogs/:id is the happy path', async () => {
    const { id, ...dto } = blogFactory.build({
      title: 'Day 4',
      content: 'Testing in Nest',
      authorId: 1,
    });

    const created = await request(app.getHttpServer())
      .post('/blogs')
      .send(dto)
      .expect(201);

    expect(created.body).toMatchObject({
      id: 1,
      title: 'Day 4',
      authorId: 1,
      author: { id: 1, name: 'John', role: 'free' },
    });

    await request(app.getHttpServer())
      .get(`/blogs/${created.body.id}`)
      .expect(200)
      .expect(created.body);
  });

  it('GET /blogs/999 returns 404', async () => {
    const res = await request(app.getHttpServer()).get('/blogs/999').expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      message: 'Blog 999 not found',
    });
  });

  it('DELETE /blogs/:id is forbidden for a non-author', async () => {
    const { id, ...dto } = blogFactory.build({
      title: 'Mine',
      content: 'John wrote this',
      authorId: 1,
    });

    const created = await request(app.getHttpServer())
      .post('/blogs')
      .send(dto)
      .expect(201);

    const res = await request(app.getHttpServer())
      .delete(`/blogs/${created.body.id}`)
      .query({ actorId: 2 })
      .expect(403);

    expect(res.body.message).toBe(
      `User 2 cannot delete blog ${created.body.id}`,
    );
  });

  it('DELETE /blogs/:id succeeds for an admin', async () => {
    const { id, ...dto } = blogFactory.build({
      title: 'Mine',
      content: 'John wrote this',
      authorId: 1,
    });

    const created = await request(app.getHttpServer())
      .post('/blogs')
      .send(dto)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/blogs/${created.body.id}`)
      .query({ actorId: 3 })
      .expect(200)
      .expect({ message: `Blog ${created.body.id} deleted successfully` });
  });
});