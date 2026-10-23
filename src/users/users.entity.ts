import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChannelMember } from '../channels/channel-member.entity';
import { Post } from '../posts/post.entity';
import { DeviceToken } from '../devices/device-token.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  pseudo!: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  marketingConsent!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  marketingConsentAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => ChannelMember, (member) => member.user)
  memberships!: ChannelMember[];

  @OneToMany(() => Post, (post) => post.user)
  posts!: Post[];

  @OneToMany(() => DeviceToken, (token) => token.user)
  deviceTokens!: DeviceToken[];
}
