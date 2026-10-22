import { User } from './users.entity';

export interface PublicUser {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    pseudo: user.pseudo,
    avatarUrl: user.avatarUrl ?? null,
  };
}
