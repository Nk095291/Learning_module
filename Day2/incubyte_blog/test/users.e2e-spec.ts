import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { userFactory } from '../src/users/factories/user.factory.js';

describe('Users (e2e)', () => {
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

  it('GET /users returns the seeded users', async () => {
    const res = await request(app.getHttpServer()).get('/users').expect(200);

    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({ id: 1, name: 'John', role: 'free' });
  });

  it('POST /users then GET /users/:id is the happy path', async () => {
    const { id, ...dto } = userFactory.build({
      name: 'Grace',
      email: 'grace@example.com',
      role: 'premium',
    });

    const created = await request(app.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(201);

    expect(created.body).toMatchObject({ id: 4, ...dto });

    await request(app.getHttpServer())
      .get(`/users/${created.body.id}`)
      .expect(200)
      .expect(created.body);
  });

  it('GET /users/999 returns 404', async () => {
    const res = await request(app.getHttpServer()).get('/users/999').expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      message: 'User 999 not found',
    });
  });
});