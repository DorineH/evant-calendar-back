import { IsString, Length } from 'class-validator';

export class JoinChannelDto {
  @IsString()
  @Length(6, 6)
  inviteCode!: string;
}
