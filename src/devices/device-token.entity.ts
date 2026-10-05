import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.deviceTokens, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  expoPushToken!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
