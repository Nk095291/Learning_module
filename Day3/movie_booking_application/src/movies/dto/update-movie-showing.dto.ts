import { PartialType } from '@nestjs/mapped-types';
import { CreateMovieShowingDto } from './create-movie-showing.dto.js';

export class UpdateMovieShowingDto extends PartialType(CreateMovieShowingDto) {}
