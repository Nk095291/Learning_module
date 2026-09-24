import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BlogsController } from './blogs.controller.js';
import { BlogsService } from './blogs.service.js';
import { UsersService } from '../users/users.service.js';
import { Database } from '../database/database.service.js';
import { blogFactory } from './factories/blog.factory.js';
import { User } from '../users/entities/user.entity.js';

describe('BlogsController', () => {
  let db: Database;
  let controller: BlogsController;
  let john: User;
  let jane: User;
  let ada: User;

  beforeEach(() => {
    db = new Database();
    const usersService = new UsersService(db);
    controller = new BlogsController(new BlogsService(db, usersService));

    john = usersService.findOne(1);
    jane = usersService.findOne(2);
    ada = usersService.findOne(3);
  });

  describe('create', () => {
    it('should create a blog and attach the author', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });

      // when
      const blog = controller.create(dto);

      // then
      expect(blog).toEqual({
        id: 1,
        title: dto.title,
        content: dto.content,
        authorId: john.id,
        author: john,
      });
      expect(db.blogs[blog.id]).toEqual(blog);
    });

    it('should throw error if author is not found', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        authorId: 999,
      });

      // when
      const createBlog = () => controller.create(dto);

      // then
      expect(createBlog).toThrow(NotFoundException);
      expect(createBlog).toThrow('User 999 not found');
      expect(controller.findAll()).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('should return all blogs', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const created = controller.create(dto);

      // when
      const blogs = controller.findAll();

      // then
      expect(blogs).toEqual([created]);
    });
  });

  describe('findOne', () => {
    it('should return a blog by id', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const created = controller.create(dto);

      // when
      const blog = controller.findOne(String(created.id));

      // then
      expect(blog).toEqual(created);
    });

    it('should throw error if blog is not found', () => {
      // given
      const missingId = '999';

      // when
      const findBlog = () => controller.findOne(missingId);

      // then
      expect(findBlog).toThrow(NotFoundException);
      expect(findBlog).toThrow(`Blog ${missingId} not found`);
    });
  });

  describe('update', () => {
    it('should throw error if actor id is not provided in the headers', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);
      const actorId = Number(undefined);

      // when
      const updateBlog = () =>
        controller.update(String(blog.id), { title: 'Updated' }, actorId);

      // then
      expect(updateBlog).toThrow(BadRequestException);
      expect(updateBlog).toThrow('Actor ID is required');
    });

    it('should update a blog if actor is the author', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);

      // when
      const updated = controller.update(
        String(blog.id),
        { title: 'Updated', content: 'New notes' },
        john.id,
      );

      // then
      expect(updated).toMatchObject({
        id: blog.id,
        title: 'Updated',
        content: 'New notes',
        authorId: john.id,
      });
      expect(controller.findOne(String(blog.id)).title).toBe('Updated');
    });

    it('should update a blog if actor is an admin', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);

      // when
      const updated = controller.update(
        String(blog.id),
        { title: 'Admin edit' },
        ada.id,
      );

      // then
      expect(updated.title).toBe('Admin edit');
      expect(updated.authorId).toBe(john.id);
      expect(controller.findOne(String(blog.id)).title).toBe('Admin edit');
    });

    it('should throw error if actor is not the author or an admin', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);

      // when
      const updateBlog = () =>
        controller.update(String(blog.id), { title: 'Nope' }, jane.id);

      // then
      expect(updateBlog).toThrow(ForbiddenException);
      expect(updateBlog).toThrow(
        `User ${jane.id} cannot update blog ${blog.id}`,
      );
      expect(controller.findOne(String(blog.id)).title).toBe(dto.title);
    });

    it('should throw error if author is not found', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);

      // when
      const updateBlog = () =>
        controller.update(String(blog.id), { authorId: 999 }, john.id);

      // then
      expect(updateBlog).toThrow(NotFoundException);
      expect(updateBlog).toThrow('User 999 not found');
      expect(controller.findOne(String(blog.id)).authorId).toBe(john.id);
    });
  });

  describe('remove', () => {
    it('should throw error if actor id is not provided in the headers', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);
      const actorId = Number(undefined);

      // when
      const deleteBlog = () => controller.remove(String(blog.id), actorId);

      // then
      expect(deleteBlog).toThrow(BadRequestException);
      expect(deleteBlog).toThrow('Actor ID is required');
      expect(controller.findOne(String(blog.id)).title).toBe(dto.title);
    });

    it('should throw error if actor is not found', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);
      const actorId = 999;

      // when
      const deleteBlog = () => controller.remove(String(blog.id), actorId);

      // then
      expect(deleteBlog).toThrow(NotFoundException);
      expect(deleteBlog).toThrow(`User ${actorId} not found`);
      expect(controller.findOne(String(blog.id)).title).toBe(dto.title);
    });

    it('should remove a blog if actor is the author', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);

      // when
      const result = controller.remove(String(blog.id), john.id);

      // then
      expect(result).toEqual({
        message: `Blog ${blog.title} (${blog.id}) deleted successfully`,
      });
      expect(() => controller.findOne(String(blog.id))).toThrow(
        NotFoundException,
      );
    });

    it('should remove a blog if actor is an admin', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);

      // when
      const result = controller.remove(String(blog.id), ada.id);

      // then
      expect(result).toEqual({
        message: `Blog ${blog.title} (${blog.id}) deleted successfully`,
      });
      expect(() => controller.findOne(String(blog.id))).toThrow(
        NotFoundException,
      );
    });

    it('should throw error if actor is not the author or an admin', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = controller.create(dto);

      // when
      const deleteBlog = () => controller.remove(String(blog.id), jane.id);

      // then
      expect(deleteBlog).toThrow(ForbiddenException);
      expect(deleteBlog).toThrow(
        `User ${jane.id} cannot delete blog ${blog.id}`,
      );
      expect(controller.findOne(String(blog.id)).title).toBe(dto.title);
    });
  });
});
