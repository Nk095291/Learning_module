import { PartialType } from '@nestjs/mapped-types';
import { CreateSeatGroupDto } from './create-seat-group.dto.js';

export class UpdateSeatGroupDto extends PartialType(CreateSeatGroupDto) {}
