import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Channel } from '../channels/channel.entity';

@Entity()
@Unique(['channel', 'user', 'dayDate']) // une photo max par jour/canal/personne
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Channel, (channel) => channel.posts, { onDelete: 'CASCADE' })
  channel!: Channel;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'date' })
  dayDate!: string;

  @Column()
  photoUrl!: string;

  @Column({ nullable: true })
  caption!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
