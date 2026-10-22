import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Channel } from './channel.entity';
import { ChannelMember, ChannelRole } from './channel-member.entity';
import { generateInviteCode } from './utils/generate-invite-code';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Post } from 'src/posts/post.entity';
import { PublicUser, toPublicUser } from '../users/public-user';

export interface MemberView {
  role: 'owner' | 'member';
  user: PublicUser;
}

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelsRepository: Repository<Channel>,
    @InjectRepository(ChannelMember)
    private readonly membersRepository: Repository<ChannelMember>,
    private readonly dataSource: DataSource,
    @InjectRepository(Post) private readonly postsRepo: Repository<Post>,
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

  private toDay(value: string | Date): string {
    return typeof value === 'string'
      ? value.slice(0, 10)
      : DateTime.fromJSDate(value).toISODate()!;
  }

  private async getMembershipOrThrow(channelId: string, userId: string) {
    const membership = await this.membersRepository.findOne({
      where: { channel: { id: channelId }, user: { id: userId } },
      relations: { channel: true },
    });
    if (!membership) {
      throw new ForbiddenException("Tu n'es pas membre de ce canal");
    }
    return membership;
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

  async findMembersPublic(channelId: string): Promise<MemberView[]> {
    const members = await this.findMembers(channelId);
    return members
      .map((m): MemberView => ({
        role: m.role,
        user: toPublicUser(m.user),
      }))
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
        return a.user.pseudo.localeCompare(b.user.pseudo, 'fr');
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

  async findOneForUser(channelId: string, userId: string) {
    const membership = await this.getMembershipOrThrow(channelId, userId);
    const c = membership.channel;
    return {
      id: c.id,
      name: c.name,
      inviteCode: c.inviteCode,
      openTime: String(c.openTime).slice(0, 5),
      timezone: c.timezone,
      startDate: this.toDay(c.startDate),
      endDate: this.toDay(c.endDate),
      myRole: membership.role,
    };
  }

  async update(channelId: string, userId: string, dto: UpdateChannelDto) {
    const membership = await this.getMembershipOrThrow(channelId, userId);
    if (membership.role !== ChannelRole.OWNER) {
      throw new ForbiddenException(
        'Seul le créateur du canal peut le modifier',
      );
    }
    const channel = membership.channel;

    let name: string | undefined;
    if (dto.name !== undefined) {
      name = dto.name.trim();
      if (!name) throw new BadRequestException('Le nom ne peut pas être vide');
    }

    const newStart = dto.startDate ?? this.toDay(channel.startDate);
    const newEnd = dto.endDate ?? this.toDay(channel.endDate);

    if (
      !DateTime.fromISO(newStart).isValid ||
      !DateTime.fromISO(newEnd).isValid
    ) {
      throw new BadRequestException(
        "Une des dates n'existe pas (ex. 31 février)",
      );
    }
    if (newStart > newEnd) {
      throw new BadRequestException(
        'La date de début doit être avant ou égale à la date de fin',
      );
    }

    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const firstPost = await this.postsRepo.findOne({
        where: { channel: { id: channelId } },
        order: { dayDate: 'ASC' },
      });
      const lastPost = await this.postsRepo.findOne({
        where: { channel: { id: channelId } },
        order: { dayDate: 'DESC' },
      });

      if (firstPost && newStart > this.toDay(firstPost.dayDate)) {
        throw new BadRequestException(
          `Des photos existent déjà le ${this.toDay(firstPost.dayDate)} : la date de début ne peut pas être après ce jour`,
        );
      }
      if (lastPost && newEnd < this.toDay(lastPost.dayDate)) {
        throw new BadRequestException(
          `Des photos existent déjà le ${this.toDay(lastPost.dayDate)} : la date de fin ne peut pas être avant ce jour`,
        );
      }
    }

    await this.channelsRepository.update(channelId, {
      ...(name !== undefined && { name }),
      ...(dto.openTime !== undefined && { openTime: dto.openTime }),
      startDate: newStart,
      endDate: newEnd,
    });

    return this.findOneForUser(channelId, userId);
  }

  async remove(channelId: string, userId: string): Promise<void> {
    const membership = await this.getMembershipOrThrow(channelId, userId);
    if (membership.role !== ChannelRole.OWNER) {
      throw new ForbiddenException(
        'Seul le créateur du canal peut le supprimer',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .delete()
        .from(Post)
        .where('"channelId" = :channelId', { channelId })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(ChannelMember)
        .where('"channelId" = :channelId', { channelId })
        .execute();

      await manager.delete(Channel, { id: channelId });
    });
  }
}
