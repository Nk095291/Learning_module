import { PartialType } from '@nestjs/mapped-types';
import { CreateMouseDto } from './create-mouse.dto.js';

export class UpdateMouseDto extends PartialType(CreateMouseDto) {}
