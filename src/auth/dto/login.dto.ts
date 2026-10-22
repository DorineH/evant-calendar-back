import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: "L'adresse email n'est pas valide" })
  email!: string;

  @IsString({ message: 'Le mot de passe est obligatoire' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  password!: string;
}
