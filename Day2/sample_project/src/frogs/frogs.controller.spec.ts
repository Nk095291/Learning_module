import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FrogsController } from './frogs.controller.js';
import { FrogsService } from './frogs.service.js';
import { Database } from '../database/database.service.js';

describe('FrogsController', () => {
  let controller: FrogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FrogsController],
      providers: [FrogsService, Database],
    }).compile();

    controller = module.get<FrogsController>(FrogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should support the full create -> fetch -> update -> delete flow', () => {
    const created = controller.create({
      name: 'Kermit',
      species: 'Tree frog',
      color: 'green',
    });
    expect(created.id).toBeDefined();

    expect(controller.findAll()).toEqual([created]);
    expect(controller.findOne(String(created.id))).toEqual(created);

    const updated = controller.update(String(created.id), { color: 'blue' });
    expect(updated.color).toBe('blue');

    const removed = controller.remove(String(created.id));
    expect(removed).toEqual({
      message: `Frog ${created.id} deleted successfully`,
    });
    expect(controller.findAll()).toEqual([]);
  });

  it('should throw NotFoundException for findOne/update/remove on an unknown id', () => {
    expect(() => controller.findOne('999')).toThrow(NotFoundException);
    expect(() => controller.update('999', { color: 'blue' })).toThrow(
      NotFoundException,
    );
    expect(() => controller.remove('999')).toThrow(NotFoundException);
  });
});
