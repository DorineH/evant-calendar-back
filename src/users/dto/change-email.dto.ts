import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ChangeEmailDto {
  @IsEmail({}, { message: "L'adresse email n'est pas valide" })
  newEmail!: string;

  @IsString({ message: 'Le mot de passe actuel est obligatoire' })
  @IsNotEmpty({ message: 'Le mot de passe actuel est obligatoire' })
  currentPassword!: string;
}
