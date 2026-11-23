import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/users.entity'; // garde ton chemin habituel
import { Post } from './post.entity';

@Entity()
@Unique(['user', 'post']) // on ne peut ouvrir un cadeau qu'une fois
export class PostOpening {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  post!: Post;

  @CreateDateColumn({ type: 'timestamptz' })
  openedAt!: Date;
}
