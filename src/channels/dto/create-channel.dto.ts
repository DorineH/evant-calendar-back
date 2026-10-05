import { IsString, MinLength, Matches, IsDateString } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:00)?$/, {
    message: 'openTime doit être au format HH:mm (ex: 18:00)',
  })
  openTime!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
