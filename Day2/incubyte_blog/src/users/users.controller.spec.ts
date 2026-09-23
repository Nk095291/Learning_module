import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { userFactory } from './factories/user.factory.js';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  const john = userFactory.build({
    id: 1,
    name: 'John',
    email: 'john@example.com',
    role: 'free',
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
    })
      .useMocker((token) => {
        if (token === UsersService) {
          return {
            create: vi.fn().mockReturnValue(
              userFactory.build({ id: 4, name: 'Ada', role: 'admin' }),
            ),
            findAll: vi.fn().mockReturnValue([john]),
            findOne: vi.fn().mockImplementation((id: number) => {
              if (id !== 1) throw new NotFoundException(`User ${id} not found`);
              return john;
            }),
            update: vi.fn().mockReturnValue({ ...john, name: 'Johnny' }),
            remove: vi
              .fn()
              .mockReturnValue({ message: 'User 1 deleted successfully' }),
          };
        }
      })
      .compile();

    controller = moduleRef.get(UsersController);
    usersService = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('should delegate to UsersService.create', () => {
      const { id, ...dto } = userFactory.build({ name: 'Ada', role: 'admin' });

      expect(controller.create(dto)).toMatchObject({ id: 4, name: 'Ada' });
      expect(usersService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return the service result', () => {
      expect(controller.findAll()).toEqual([john]);
    });
  });

  describe('findOne', () => {
    it('should coerce the path param to a number', () => {
      expect(controller.findOne('1')).toEqual(john);
      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should surface NotFoundException from the service', () => {
      expect(() => controller.findOne('999')).toThrow(NotFoundException);
    });
  });
});