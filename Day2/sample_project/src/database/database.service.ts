import { Injectable } from '@nestjs/common';
import { Frog } from '../frogs/entities/frog.entity.js';

@Injectable()
export class Database {
  frogs: Frog[] = [];

  private frogId = 1;

  nextFrogId() {
    return this.frogId++;
  }
}
