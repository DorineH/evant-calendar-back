import { BadRequestException, Logger } from '@nestjs/common';
import * as dns from 'dns';

// Résolveur DNS avec un délai court : 3 s par essai, 2 essais maximum
const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 2 });
const logger = new Logger('EmailDomainValidator');

function domainError(domain: string): BadRequestException {
  const message = `Le domaine « ${domain} » n'existe pas ou ne peut pas recevoir d'emails. Vérifie ton adresse.`;
  return new BadRequestException({
    statusCode: 400,
    message,
    errors: { email: message },
  });
}

/** Extrait le code d'une erreur Node.js (ex. "ENOTFOUND") de façon typée. */
function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return typeof err.code === 'string' ? err.code : undefined;
  }
  return undefined;
}

/**
 * Vérifie que le domaine de l'email possède au moins un serveur de messagerie (MX).
 * Lève une erreur 400 si le domaine n'existe pas ou ne reçoit pas d'emails.
 * Si le DNS ne répond pas (panne, délai dépassé), on laisse passer l'inscription.
 */
export async function assertEmailDomainCanReceiveMail(
  email: string,
): Promise<void> {
  const domain = email.split('@').pop()?.trim().toLowerCase();
  if (!domain) {
    throw new BadRequestException('Adresse email invalide');
  }

  let records: dns.MxRecord[];
  try {
    records = await resolver.resolveMx(domain);
  } catch (err: any) {
    const code = getErrorCode(err);

    if (code === dns.NOTFOUND || code === dns.NODATA) {
      throw domainError(domain);
    }
    logger.warn(
      `Vérification DNS impossible pour « ${domain} » (${code ?? err}) : inscription autorisée`,
    );
    return;
  }

  const usable = records.filter((r) => r.exchange && r.exchange !== '.');
  if (usable.length === 0) {
    throw domainError(domain);
  }
}
