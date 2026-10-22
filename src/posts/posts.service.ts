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

export interface PostView {
  id: string;
  photoUrl: string;
  caption: string | null;
  dayDate: string;
  user: PublicUser;
}

export interface DayPostsResult {
  locked: boolean;
  unlocksAt: string;
  posts: PostView[];
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private channelsService: ChannelsService,
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

    if (locked) {
      // Verrouillé : on ne renvoie que MA propre photo, pas celles des autres
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
        posts: myPost ? [this.toPostView(myPost)] : [],
      };
    }

    // Déverrouillé : tout le monde voit toutes les photos du jour
    const posts = await this.postsRepository.find({
      where: { channel: { id: channelId }, dayDate },
      relations: { user: true },
    });

    return {
      locked: false,
      unlocksAt: unlockMoment.toISO()!,
      posts: posts.map((p) => this.toPostView(p)),
    };
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

  private toPostView(post: Post): PostView {
    return {
      id: post.id,
      photoUrl: post.photoUrl,
      caption: post.caption ?? null,
      dayDate: post.dayDate,
      user: toPublicUser(post.user),
    };
  }
}
