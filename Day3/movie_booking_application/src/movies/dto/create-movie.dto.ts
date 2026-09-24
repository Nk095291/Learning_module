import { IsInt, IsString } from 'class-validator';

export class CreateMovieDto {
  @IsString()
  title: string;

  @IsInt()
  ageRating: number;
}
