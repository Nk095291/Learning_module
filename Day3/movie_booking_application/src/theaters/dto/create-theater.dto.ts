import { IsString } from 'class-validator';

export class CreateTheaterDto {
  @IsString()
  name: string;

  @IsString()
  locality: string;

  @IsString()
  city: string;

  @IsString()
  state: string;
}
