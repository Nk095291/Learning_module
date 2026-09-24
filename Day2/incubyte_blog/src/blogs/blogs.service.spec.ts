import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BlogsService } from './blogs.service.js';
import { UsersService } from '../users/users.service.js';
import { Database } from '../database/database.service.js';
import { blogFactory } from './factories/blog.factory.js';
import { User } from '../users/entities/user.entity.js';
import { CreateBlogDto } from './dto/create-blog.dto.js';

describe('BlogsService', () => {
  let db: Database;
  let usersService: UsersService;
  let service: BlogsService;
  let john: User;
  let jane: User;
  let ada: User;

  beforeEach(() => {
    db = new Database();
    usersService = new UsersService(db);
    service = new BlogsService(db, usersService);

    // NOTE : in production we persist the data in the database but for now we are using
    // already created users in the database.
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
      const blog = service.create(dto);

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
      const createBlog = () => service.create(dto);

      // then
      expect(createBlog).toThrow(NotFoundException);
      expect(createBlog).toThrow('User 999 not found');
      expect(service.findAll()).toHaveLength(0);
    });

  });

  describe('findAll', () => {
    it('should return all blogs', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const created = service.create(dto);

      // when
      const blogs = service.findAll();

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
      const created = service.create(dto);

      // when
      const blog = service.findOne(created.id);

      // then
      expect(blog).toEqual(created);
    });

    it('should throw error if blog is not found', () => {
      // given
      const missingId = 999;

      // when
      const findBlog = () => service.findOne(missingId);

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
      const blog = service.create(dto);
      const actorId = Number(undefined);

      // when
      const updateBlog = () =>
        service.update(blog.id, { title: 'Updated' }, actorId);

      // then
      expect(updateBlog).toThrow(BadRequestException);
      expect(updateBlog).toThrow('Actor ID is required');
    });

    it('should update a blog if actor is the author', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);

      // when
      const updated = service.update(
        blog.id,
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
      expect(service.findOne(blog.id).title).toBe('Updated');
    });

    it('should update a blog if actor is an admin', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);

      // when
      const updated = service.update(blog.id, { title: 'Admin edit' }, ada.id);

      // then
      expect(updated.title).toBe('Admin edit');
      expect(updated.authorId).toBe(john.id);
      expect(service.findOne(blog.id).title).toBe('Admin edit');
    });

    it('should throw error if actor is not the author or an admin', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);

      // when
      const updateBlog = () =>
        service.update(blog.id, { title: 'Nope' }, jane.id);

      // then
      expect(updateBlog).toThrow(ForbiddenException);
      expect(updateBlog).toThrow(
        `User ${jane.id} cannot update blog ${blog.id}`,
      );
      expect(service.findOne(blog.id).title).toBe(dto.title);
    });

    it('should throw error if author is not found', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);

      // when
      const updateBlog = () =>
        service.update(blog.id, { authorId: 999 }, john.id);

      // then
      expect(updateBlog).toThrow(NotFoundException);
      expect(updateBlog).toThrow('User 999 not found');
      expect(service.findOne(blog.id).authorId).toBe(john.id);
    });
  });

  describe('remove', () => {
    it('should throw error if actor id is not provided in the headers', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);
      const actorId = Number(undefined);

      // when
      const deleteBlog = () => service.remove(blog.id, actorId);

      // then
      expect(deleteBlog).toThrow(BadRequestException);
      expect(deleteBlog).toThrow('Actor ID is required');
      expect(service.findOne(blog.id).title).toBe(dto.title);
    });

    it('should throw error if actor is not found', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);
      const actorId = 999;

      // when
      const deleteBlog = () => service.remove(blog.id, actorId);

      // then
      expect(deleteBlog).toThrow(NotFoundException);
      expect(deleteBlog).toThrow(`User ${actorId} not found`);
      expect(service.findOne(blog.id).title).toBe(dto.title);
    });

    it('should remove a blog if actor is the author', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);

      // when
      const result = service.remove(blog.id, john.id);

      // then
      expect(result).toEqual({
        message: `Blog ${blog.title} (${blog.id}) deleted successfully`,
      });
      expect(() => service.findOne(blog.id)).toThrow(NotFoundException);
    });

    it('should remove a blog if actor is an admin', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);

      // when
      const result = service.remove(blog.id, ada.id);

      // then
      expect(result).toEqual({
        message: `Blog ${blog.title} (${blog.id}) deleted successfully`,
      });
      expect(() => service.findOne(blog.id)).toThrow(NotFoundException);
    });

    it('should throw error if actor is not the author or an admin', () => {
      // given
      const { id, author, ...dto } = blogFactory.build({
        author: john,
      });
      const blog = service.create(dto);

      // when
      const deleteBlog = () => service.remove(blog.id, jane.id);

      // then
      expect(deleteBlog).toThrow(ForbiddenException);
      expect(deleteBlog).toThrow(
        `User ${jane.id} cannot delete blog ${blog.id}`,
      );
      expect(service.findOne(blog.id).title).toBe(dto.title);
    });
  });
});
