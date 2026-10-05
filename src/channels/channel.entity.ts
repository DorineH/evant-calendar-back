import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../users/users.entity';
import { ChannelMember } from './channel-member.entity';
import { Post } from '../posts/post.entity';

@Entity()
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  inviteCode!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  owner!: User;

  @Column({ type: 'time' })
  openTime!: string; // ex: "18:00:00"

  @Column({ default: 'Europe/Paris' })
  timezone!: string;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => ChannelMember, (member) => member.channel)
  members!: ChannelMember[];

  @OneToMany(() => Post, (post) => post.channel)
  posts!: Post[];
}
