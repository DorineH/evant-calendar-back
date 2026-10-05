import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Channel } from './channel.entity';

export enum ChannelRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

@Entity()
export class ChannelMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Channel, (channel) => channel.members, {
    onDelete: 'CASCADE',
  })
  channel!: Channel;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'enum', enum: ChannelRole, default: ChannelRole.MEMBER })
  role!: ChannelRole;

  @CreateDateColumn()
  joinedAt!: Date;
}
