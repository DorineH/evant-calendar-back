import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { DateTime } from 'luxon';
import { Post } from './post.entity';
import { ChannelsService } from '../channels/channels.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PublicUser, toPublicUser } from '../users/public-user';
import { ForbiddenException } from '@nestjs/common';
import { In } from 'typeorm';
import { PostOpening } from './post-opening.entity';

export interface PostView {
  id: string;
  photoUrl: string;
  caption: string | null;
  dayDate: string;
  user: PublicUser;
  isMine: boolean;
  openedByMe: boolean;
}

export interface DayPostsResult {
  locked: boolean;
  unlocksAt: string;
  posts: PostView[];
  othersCount: number;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private channelsService: ChannelsService,
    @InjectRepository(PostOpening)
    private readonly openingsRepository: Repository<PostOpening>,
  ) {}

  async create(
    channelId: string,
    userId: string,
    dto: CreatePostDto,
  ): Promise<Post> {
    const post = this.postsRepository.create({
      channel: { id: channelId },
      user: { id: userId },
      dayDate: dto.dayDate,
      photoUrl: dto.photoUrl,
      caption: dto.caption,
    });

    try {
      return await this.postsRepository.save(post);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === '23505'
      ) {
        throw new ConflictException(
          'Tu as déjà posté une photo pour ce jour dans ce canal',
        );
      }
      throw error;
    }
  }

  async findDayPosts(
    channelId: string,
    dayDate: string,
    requestingUserId: string,
  ): Promise<DayPostsResult> {
    const channel = await this.channelsService.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Canal introuvable');
    }

    const unlockMoment = this.computeUnlockMoment(
      dayDate,
      channel.openTime,
      channel.timezone,
    );
    const locked = DateTime.now() < unlockMoment;

    const totalCount = await this.postsRepository.count({
      where: { channel: { id: channelId }, dayDate },
    });

    if (locked) {
      // Verrouillé
      const myPost = await this.postsRepository.findOne({
        where: {
          channel: { id: channelId },
          user: { id: requestingUserId },
          dayDate,
        },
        relations: { user: true },
      });
      return {
        locked: true,
        unlocksAt: unlockMoment.toISO()!,
        posts: myPost
          ? [this.toPostView(myPost, requestingUserId, new Set())]
          : [],
        othersCount: totalCount - (myPost ? 1 : 0),
      };
    }

    // Déverrouillé
    const posts = await this.postsRepository.find({
      where: { channel: { id: channelId }, dayDate },
      relations: { user: true },
    });

    const openedIds = new Set<string>();
    if (posts.length > 0) {
      const openings = await this.openingsRepository.find({
        where: {
          user: { id: requestingUserId },
          post: { id: In(posts.map((p) => p.id)) },
        },
        relations: { post: true },
      });
      openings.forEach((o) => openedIds.add(o.post.id));
    }

    const views = posts
      .map((p) => this.toPostView(p, requestingUserId, openedIds))
      .sort((a, b) => Number(b.isMine) - Number(a.isMine));

    return {
      locked: false,
      unlocksAt: unlockMoment.toISO()!,
      posts: views,
      othersCount: views.filter((v) => !v.isMine).length,
    };
  }

  async openPost(
    channelId: string,
    postId: string,
    userId: string,
  ): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: { channel: true, user: true },
    });

    if (!post || post.channel.id !== channelId) {
      throw new NotFoundException('Cadeau introuvable');
    }

    if (post.user.id === userId) return;

    const unlockMoment = this.computeUnlockMoment(
      post.dayDate,
      post.channel.openTime,
      post.channel.timezone,
    );
    if (DateTime.now() < unlockMoment) {
      throw new ForbiddenException('Ce cadeau ne peut pas encore être ouvert');
    }

    await this.openingsRepository
      .createQueryBuilder()
      .insert()
      .into(PostOpening)
      .values({ user: { id: userId }, post: { id: postId } })
      .orIgnore()
      .execute();
  }

  private computeUnlockMoment(
    dayDate: string,
    openTime: string,
    timezone: string,
  ): DateTime {
    const [hours, minutes] = openTime.split(':').map(Number);
    return DateTime.fromISO(dayDate, { zone: timezone }).set({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0,
    });
  }

  private toPostView(
    post: Post,
    viewerId: string,
    openedIds: Set<string>,
  ): PostView {
    const isMine = post.user.id === viewerId;
    return {
      id: post.id,
      photoUrl: post.photoUrl,
      caption: post.caption ?? null,
      dayDate: post.dayDate,
      user: toPublicUser(post.user),
      isMine,
      openedByMe: isMine || openedIds.has(post.id),
    };
  }
}
