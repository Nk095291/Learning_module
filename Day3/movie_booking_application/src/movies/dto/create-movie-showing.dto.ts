import { IsInt, IsString } from 'class-validator';

export class CreateMovieShowingDto {
  @IsInt()
  movieId: number;

  @IsInt()
  theaterId: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  showDate: string;
}
