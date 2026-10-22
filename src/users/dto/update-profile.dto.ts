import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Le pseudo est obligatoire' })
  @MinLength(2, { message: 'Le pseudo doit contenir au moins 2 caractères' })
  @MaxLength(30, { message: 'Le pseudo ne peut pas dépasser 30 caractères' })
  pseudo?: string;

  /** URL Cloudinary de l'avatar, ou null pour le supprimer */
  @IsOptional()
  @IsString({ message: "L'URL de l'avatar n'est pas valide" })
  avatarUrl?: string | null;
}
