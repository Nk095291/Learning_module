// database.module.ts
import { Module } from '@nestjs/common';
import { Database } from './database.service.js';

@Module({
  providers: [Database],
  exports: [Database],
})
export class DatabaseModule {}