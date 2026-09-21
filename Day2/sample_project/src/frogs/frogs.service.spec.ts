import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FrogsService } from './frogs.service.js';
import { Database } from '../database/database.service.js';

describe('FrogsService', () => {
  let service: FrogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FrogsService, Database],
    }).compile();

    service = module.get<FrogsService>(FrogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a frog with an auto-generated id', () => {
    const frog = service.create({
      name: 'Kermit',
      species: 'Tree frog',
      color: 'green',
    });

    expect(frog.id).toBeDefined();
    expect(frog).toMatchObject({
      name: 'Kermit',
      species: 'Tree frog',
      color: 'green',
    });
  });

  it('should fetch all created frogs', () => {
    service.create({ name: 'Kermit', species: 'Tree frog', color: 'green' });
    service.create({ name: 'Froggy', species: 'Bullfrog', color: 'brown' });

    const frogs = service.findAll();

    expect(frogs).toHaveLength(2);
  });

  it('should fetch a frog by id', () => {
    const created = service.create({
      name: 'Kermit',
      species: 'Tree frog',
      color: 'green',
    });

    const frog = service.findOne(created.id);

    expect(frog).toEqual(created);
  });

  it('should throw NotFoundException when fetching an unknown id', () => {
    expect(() => service.findOne(999)).toThrow(NotFoundException);
  });

  it('should update a frog', () => {
    const created = service.create({
      name: 'Kermit',
      species: 'Tree frog',
      color: 'green',
    });

    const updated = service.update(created.id, { color: 'blue' });

    expect(updated.color).toBe('blue');
    expect(updated.name).toBe('Kermit');
  });

  it('should throw NotFoundException when updating an unknown id', () => {
    expect(() => service.update(999, { color: 'blue' })).toThrow(
      NotFoundException,
    );
  });

  it('should delete a frog', () => {
    const created = service.create({
      name: 'Kermit',
      species: 'Tree frog',
      color: 'green',
    });

    const result = service.remove(created.id);

    expect(result).toEqual({
      message: `Frog ${created.id} deleted successfully`,
    });
    expect(service.findAll()).toHaveLength(0);
    expect(() => service.findOne(created.id)).toThrow(NotFoundException);
  });

  it('should throw NotFoundException when deleting an unknown id', () => {
    expect(() => service.remove(999)).toThrow(NotFoundException);
  });
});
