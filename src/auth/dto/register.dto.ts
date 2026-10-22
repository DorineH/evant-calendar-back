import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: "L'adresse email n'est pas valide" })
  email!: string;

  @IsString({ message: 'Le mot de passe est obligatoire' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  password!: string;

  @IsString({ message: 'Le pseudo est obligatoire' })
  @MinLength(2, { message: 'Le pseudo doit contenir au moins 2 caractères' })
  @MaxLength(30, { message: 'Le pseudo ne peut pas dépasser 30 caractères' })
  pseudo!: string;
}
