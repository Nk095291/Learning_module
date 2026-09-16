import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller.js';
import { CatService } from './cats.service.js';


@Module({
    controllers: [CatsController],
    providers: [CatService],
})
export class CatsModule {}
