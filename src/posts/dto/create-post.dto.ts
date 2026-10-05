import {
  IsString,
  IsUrl,
  IsDateString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreatePostDto {
  @IsUrl()
  photoUrl!: string;

  @IsDateString()
  dayDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}
