import { BadRequestException, ConflictException } from '@nestjs/common';

/** Erreur 400 rattachée à un champ du formulaire */
export function fieldError(
  field: string,
  message: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    message,
    errors: { [field]: message },
  });
}

/** Erreur 409 (conflit, ex. email déjà utilisé) rattachée à un champ */
export function fieldConflict(
  field: string,
  message: string,
): ConflictException {
  return new ConflictException({
    statusCode: 409,
    message,
    errors: { [field]: message },
  });
}
