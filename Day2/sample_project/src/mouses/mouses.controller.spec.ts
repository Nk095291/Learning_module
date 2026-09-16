import { Test, TestingModule } from '@nestjs/testing';
import { MousesController } from './mouses.controller.js';
import { MousesService } from './mouses.service.js';

describe('MousesController', () => {
  let controller: MousesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MousesController],
      providers: [MousesService],
    }).compile();

    controller = module.get<MousesController>(MousesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
