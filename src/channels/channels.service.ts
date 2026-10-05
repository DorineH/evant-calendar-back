import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Channel } from './channel.entity';
import { ChannelMember, ChannelRole } from './channel-member.entity';
import { generateInviteCode } from './utils/generate-invite-code';
import { CreateChannelDto } from './dto/create-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(Channel)
    private channelsRepository: Repository<Channel>,
    @InjectRepository(ChannelMember)
    private membersRepository: Repository<ChannelMember>,
    private dataSource: DataSource,
  ) {}

  private async generateUniqueInviteCode(): Promise<string> {
    let code = generateInviteCode();
    let existing = await this.channelsRepository.findOne({
      where: { inviteCode: code },
    });

    while (existing) {
      code = generateInviteCode();
      existing = await this.channelsRepository.findOne({
        where: { inviteCode: code },
      });
    }

    return code;
  }

  async create(dto: CreateChannelDto, ownerId: string): Promise<Channel> {
    const inviteCode = await this.generateUniqueInviteCode();

    return this.dataSource.transaction(async (manager) => {
      const channel = manager.create(Channel, {
        name: dto.name,
        openTime: dto.openTime,
        startDate: dto.startDate,
        endDate: dto.endDate,
        inviteCode,
        owner: { id: ownerId },
      });
      const savedChannel = await manager.save(channel);

      const member = manager.create(ChannelMember, {
        channel: savedChannel,
        user: { id: ownerId },
        role: ChannelRole.OWNER,
      });
      await manager.save(member);

      return savedChannel;
    });
  }

  async joinByInviteCode(inviteCode: string, userId: string): Promise<Channel> {
    const channel = await this.channelsRepository.findOne({
      where: { inviteCode },
    });
    if (!channel) {
      throw new NotFoundException(
        "Aucun canal ne correspond à ce code d'invitation",
      );
    }

    const alreadyMember = await this.membersRepository.findOne({
      where: { channel: { id: channel.id }, user: { id: userId } },
    });
    if (alreadyMember) {
      throw new ConflictException('Tu fais déjà partie de ce canal');
    }

    const member = this.membersRepository.create({
      channel,
      user: { id: userId },
      role: ChannelRole.MEMBER,
    });
    await this.membersRepository.save(member);

    return channel;
  }

  async findUserChannels(userId: string): Promise<Channel[]> {
    const memberships = await this.membersRepository.find({
      where: { user: { id: userId } },
      relations: { channel: true },
    });
    return memberships.map((m) => m.channel);
  }

  async findMembers(channelId: string): Promise<ChannelMember[]> {
    return this.membersRepository.find({
      where: { channel: { id: channelId } },
      relations: { user: true },
    });
  }

  async isMember(channelId: string, userId: string): Promise<boolean> {
    const member = await this.membersRepository.findOne({
      where: { channel: { id: channelId }, user: { id: userId } },
    });
    return !!member;
  }

  async findById(channelId: string): Promise<Channel | null> {
    return this.channelsRepository.findOne({ where: { id: channelId } });
  }

  async findAll(): Promise<Channel[]> {
    return this.channelsRepository.find();
  }
}
