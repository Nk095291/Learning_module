import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BlogsService } from './blogs.service.js';
import { UsersService } from '../users/users.service.js';
import { Database } from '../database/database.service.js';
import { blogFactory } from './factories/blog.factory.js';
import { userFactory } from '../users/factories/user.factory.js';
import { User } from '../users/entities/user.entity.js';

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
    it('should persist a blog and attach the author', () => {
      const { id, author, ...dto } = blogFactory.build({
        title: 'Hello Nest',
        content: 'Testing notes',
        author: john,
      });

      const blog = service.create(dto);

      expect(blog).toMatchObject({
        id: 1,
        title: 'Hello Nest',
        authorId: john.id,
        author: { id: john.id, name: john.name, role: john.role },
      });
      expect(service.findAll()).toHaveLength(1);
    });

    it('should throw when the author does not exist', () => {
      const { id, author, ...dto } = blogFactory.build({ authorId: 999 });

      expect(() => service.create(dto)).toThrow(NotFoundException);
      expect(() => service.create(dto)).toThrow('User 999 not found');
    });
  });

  describe('findOne', () => {
    it('should return a blog with its author', () => {
      const { id, author, ...dto } = blogFactory.build({
        title: 'Roles',
        author: john,
      });
      const created = service.create(dto);

      expect(service.findOne(created.id).title).toBe('Roles');
    });

    it('should throw NotFoundException for an unknown id', () => {
      expect(() => service.findOne(999)).toThrow('Blog 999 not found');
    });
  });

  describe('remove', () => {
    it('should let the author delete their own blog', () => {
      const { id, author, ...dto } = blogFactory.build({ author: john });
      const blog = service.create(dto);

      expect(service.remove(blog.id, john.id)).toEqual({
        message: `Blog ${blog.id} deleted successfully`,
      });
      expect(service.findAll()).toHaveLength(0);
    });

    it("should let an admin delete someone else's blog", () => {
      const { id, author, ...dto } = blogFactory.build({ author: john });
      const blog = service.create(dto);

      expect(service.remove(blog.id, ada.id)).toEqual({
        message: `Blog ${blog.id} deleted successfully`,
      });
    });

    it('should forbid a non-author from deleting a blog', () => {
      const { id, author, ...dto } = blogFactory.build({ author: john });
      const blog = service.create(dto);

      expect(() => service.remove(blog.id, jane.id)).toThrow(ForbiddenException);
      expect(() => service.remove(blog.id, jane.id)).toThrow(
        `User ${jane.id} cannot delete blog ${blog.id}`,
      );
    });
  });
});