import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateBlogDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    content: string;

    @IsNotEmpty()
    @IsNumber()
    authorId: number;
}
