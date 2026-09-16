import { Test, TestingModule } from '@nestjs/testing';
import { MousesService } from './mouses.service.js';

describe('MousesService', () => {
  let service: MousesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MousesService],
    }).compile();

    service = module.get<MousesService>(MousesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
