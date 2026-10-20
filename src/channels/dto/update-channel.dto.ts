import { IsOptional, IsString, Length, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Le nom doit faire entre 1 et 50 caractères' })
  name?: string;

  @IsOptional()
  @Matches(TIME_REGEX, {
    message: "L'heure d'ouverture doit être au format HH:mm",
  })
  openTime?: string;

  @IsOptional()
  @Matches(DATE_REGEX, {
    message: 'La date de début doit être au format AAAA-MM-JJ',
  })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_REGEX, {
    message: 'La date de fin doit être au format AAAA-MM-JJ',
  })
  endDate?: string;
}
