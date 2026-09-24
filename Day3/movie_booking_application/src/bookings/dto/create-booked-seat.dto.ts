import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateBookedSeatDto {
  @IsInt()
  seatId: number;

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsDateString()
  userDOB?: string;
}
