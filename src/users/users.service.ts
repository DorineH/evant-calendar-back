import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import { Repository } from 'typeorm';
import { assertEmailDomainCanReceiveMail } from '../auth/email-domain.validator';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './users.entity'; // garde ton chemin d'import actuel
import { fieldConflict, fieldError } from 'src/common/field-error';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(
    email: string,
    passwordHash: string,
    pseudo: string,
    marketingConsent = false,
  ): Promise<User> {
    const user = this.usersRepository.create({
      email,
      passwordHash,
      pseudo,
      marketingConsent,
      marketingConsentAt: marketingConsent ? new Date() : null,
    });
    return this.usersRepository.save(user);
  }

  // ---------- Utilitaires ----------

  /** Retire le hash du mot de passe avant de renvoyer l'utilisateur */
  toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  private async getByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  private async assertCurrentPassword(user: User, currentPassword: string) {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok)
      throw fieldError('currentPassword', 'Mot de passe actuel incorrect');
  }

  private avatarPublicId(userId: string): string {
    return `avatars/${userId}`;
  }

  /** L'URL doit venir de NOTRE Cloudinary, dans le dossier de CET utilisateur */
  private isOwnAvatarUrl(url: string, userId: string): boolean {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const pattern = new RegExp(
      `^https://res\\.cloudinary\\.com/${cloud}/image/upload/(v\\d+/)?avatars/${userId}\\.(jpg|jpeg|png|webp|heic)$`,
      'i',
    );
    return pattern.test(url);
  }

  // ---------- Profil ----------

  async getMe(userId: string): Promise<SafeUser> {
    return this.toSafeUser(await this.getByIdOrThrow(userId));
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await this.getByIdOrThrow(userId);

    if (dto.pseudo !== undefined) {
      const pseudo = dto.pseudo.trim();
      if (pseudo.length < 2) {
        throw fieldError(
          'pseudo',
          'Le pseudo doit contenir au moins 2 caractères',
        );
      }
      user.pseudo = pseudo;
    }

    if (dto.avatarUrl === null) {
      // Suppression de l'avatar : en base, puis sur Cloudinary
      user.avatarUrl = null;
      cloudinary.uploader
        .destroy(this.avatarPublicId(userId), { invalidate: true })
        .catch((err) =>
          this.logger.warn(`Suppression avatar Cloudinary échouée : ${err}`),
        );
    } else if (dto.avatarUrl !== undefined) {
      if (!this.isOwnAvatarUrl(dto.avatarUrl, userId)) {
        throw fieldError('avatarUrl', "Cette image d'avatar n'est pas valide");
      }
      user.avatarUrl = dto.avatarUrl;
    }

    if (
      dto.marketingConsent !== undefined &&
      dto.marketingConsent !== user.marketingConsent
    ) {
      user.marketingConsent = dto.marketingConsent;
      user.marketingConsentAt = dto.marketingConsent ? new Date() : null;
    }

    const saved = await this.usersRepository.save(user);
    return this.toSafeUser(saved);
  }

  // ---------- Email ----------

  async changeEmail(userId: string, dto: ChangeEmailDto): Promise<SafeUser> {
    const user = await this.getByIdOrThrow(userId);
    const newEmail = dto.newEmail.trim();

    await this.assertCurrentPassword(user, dto.currentPassword);

    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      throw fieldError('newEmail', "C'est déjà ton adresse email actuelle");
    }

    try {
      await assertEmailDomainCanReceiveMail(newEmail);
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        const res = err.getResponse();
        const message =
          typeof res === 'object' &&
          res !== null &&
          'message' in res &&
          typeof res.message === 'string'
            ? res.message
            : "Le domaine de cet email n'est pas valide";
        throw fieldError('newEmail', message);
      }
      throw err;
    }

    const existing = await this.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw fieldConflict('newEmail', 'Un compte existe déjà avec cet email');
    }

    user.email = newEmail;
    const saved = await this.usersRepository.save(user);
    return this.toSafeUser(saved);
  }

  // ---------- Mot de passe ----------

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.getByIdOrThrow(userId);

    await this.assertCurrentPassword(user, dto.currentPassword);

    const sameAsBefore = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (sameAsBefore) {
      throw fieldError(
        'newPassword',
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.save(user);
  }

  // ---------- Signature Cloudinary pour l'avatar ----------

  createAvatarSignature(userId: string) {
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = this.avatarPublicId(userId);

    const paramsToSign = {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!,
    );

    return {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      publicId,
    };
  }
}
