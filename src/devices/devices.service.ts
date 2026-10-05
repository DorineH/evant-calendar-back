import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from './device-token.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokensRepository: Repository<DeviceToken>,
  ) {}

  async register(userId: string, expoPushToken: string): Promise<DeviceToken> {
    const existing = await this.deviceTokensRepository.findOne({
      where: { expoPushToken },
    });

    if (existing) {
      existing.user = { id: userId } as DeviceToken['user'];
      return this.deviceTokensRepository.save(existing);
    }

    const token = this.deviceTokensRepository.create({
      user: { id: userId },
      expoPushToken,
    });
    return this.deviceTokensRepository.save(token);
  }

  async findTokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];

    const tokens = await this.deviceTokensRepository.find({
      where: userIds.map((id) => ({ user: { id } })),
    });
    return tokens.map((t) => t.expoPushToken);
  }
}
