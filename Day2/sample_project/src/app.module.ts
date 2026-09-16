import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { CatsController } from './cats/cats.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [],
  controllers: [AppController, CatsController],
  providers: [AppService],
})
export class AppModule {}
