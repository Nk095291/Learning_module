import { Module } from '@nestjs/common';
import { MousesService } from './mouses.service.js';
import { MousesController } from './mouses.controller.js';

@Module({
  controllers: [MousesController],
  providers: [MousesService],
})
export class MousesModule {}
