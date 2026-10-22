import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Le mot de passe actuel est obligatoire' })
  @IsNotEmpty({ message: 'Le mot de passe actuel est obligatoire' })
  currentPassword!: string;

  @IsString({ message: 'Le nouveau mot de passe est obligatoire' })
  @MinLength(8, {
    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
  })
  newPassword!: string;
}
