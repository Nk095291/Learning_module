import { IsDateString, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  email: string;

  @IsDateString()
  dob: string;
}
