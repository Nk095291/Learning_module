import { Injectable } from '@nestjs/common';
import { CreateMouseDto } from './dto/create-mouse.dto.js';
import { UpdateMouseDto } from './dto/update-mouse.dto.js';

@Injectable()
export class MousesService {
  create(createMouseDto: CreateMouseDto) {
    return 'This action adds a new mouse';
  }

  findAll() {
    return `This action returns all mouses`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mouse`;
  }

  update(id: number, updateMouseDto: UpdateMouseDto) {
    return `This action updates a #${id} mouse`;
  }

  remove(id: number) {
    return `This action removes a #${id} mouse`;
  }
}
