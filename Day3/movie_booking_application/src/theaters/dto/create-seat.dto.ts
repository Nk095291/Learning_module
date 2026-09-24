import { IsInt, IsString } from 'class-validator';

export class CreateSeatDto {
  @IsInt()
  theaterId: number;

  @IsString()
  seatNumber: string;

  @IsString()
  row: string;

  @IsInt()
  col: number;
}
