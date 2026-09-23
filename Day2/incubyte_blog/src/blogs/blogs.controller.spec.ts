import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { BlogsController } from './blogs.controller.js';
import { BlogsService } from './blogs.service.js';
import { blogFactory } from './factories/blog.factory.js';
import { userFactory } from '../users/factories/user.factory.js';

describe('BlogsController', () => {
  let controller: BlogsController;
  let blogsService: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  const author = userFactory.build({
    id: 1,
    name: 'John',
    email: 'john@example.com',
    role: 'free',
  });
  const blog = {
    ...blogFactory.build({
      id: 1,
      title: 'Hello',
      content: 'World',
      authorId: 1,
    }),
    author,
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BlogsController],
    })
      .useMocker((token) => {
        if (token === BlogsService) {
          return {
            create: vi.fn().mockReturnValue(blog),
            findAll: vi.fn().mockReturnValue([blog]),
            findOne: vi.fn().mockImplementation((id: number) => {
              if (id !== 1) throw new NotFoundException(`Blog ${id} not found`);
              return blog;
            }),
            update: vi.fn().mockReturnValue({ ...blog, title: 'Updated' }),
            remove: vi.fn().mockImplementation((_id: number, actorId: number) => {
              if (actorId === 2) {
                throw new ForbiddenException('User 2 cannot delete blog 1');
              }
              return { message: 'Blog 1 deleted successfully' };
            }),
          };
        }
      })
      .compile();

    controller = moduleRef.get(BlogsController);
    blogsService = moduleRef.get(BlogsService);
  });

  describe('create', () => {
    it('should return the created blog', () => {
      const { id, ...dto } = blogFactory.build({
        title: 'Hello',
        content: 'World',
        authorId: 1,
      });

      expect(controller.create(dto)).toEqual(blog);
      expect(blogsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findOne', () => {
    it('should coerce the id and return the blog', () => {
      expect(controller.findOne('1')).toEqual(blog);
      expect(blogsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should surface NotFoundException', () => {
      expect(() => controller.findOne('999')).toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should pass id and actorId as numbers', () => {
      expect(controller.remove('1', '3')).toEqual({
        message: 'Blog 1 deleted successfully',
      });
      expect(blogsService.remove).toHaveBeenCalledWith(1, 3);
    });

    it('should surface ForbiddenException', () => {
      expect(() => controller.remove('1', '2')).toThrow(ForbiddenException);
    });
  });
});