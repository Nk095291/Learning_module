import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';

import { AppService } from './app.service.js';

import { DogsController } from './dogs/dogs.controller.js';
import { MousesModule } from './mouses/mouses.module.js';
import { DogsService } from './dogs/dogs.service.js';
import { DogsModule } from './dogs/dogs.module.js';
import { CatsModule } from './cats/cats.module.js';

@Module({
  imports: [MousesModule, DogsModule, CatsModule],
  controllers: [AppController, DogsController],
  providers: [AppService, DogsService],
})
export class AppModule {}
