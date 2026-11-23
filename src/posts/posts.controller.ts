import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Body,
  UseGuards,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChannelsService } from '../channels/channels.service';
import { StorageService } from '../storage/storage.service';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { fieldError } from '../common/field-error';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('channels/:channelId/posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private channelsService: ChannelsService,
    private storageService: StorageService,
    private postsService: PostsService,
  ) {}

  @Post('upload-signature')
  async getUploadSignature(
    @Param('channelId') channelId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.assertMember(channelId, req.user.userId);

    const channel = await this.channelsService.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Canal introuvable');
    }

    const today = DateTime.now().setZone(channel.timezone).toISODate();
    const folder = `channels/${channelId}/${today}`;

    return this.storageService.generateUploadSignature(folder);
  }

  @Post()
  async create(
    @Param('channelId') channelId: string,
    @Body() dto: CreatePostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.assertMember(channelId, req.user.userId);

    const { channel, today } = await this.getChannelAndToday(channelId);

    if (dto.dayDate !== today) {
      throw fieldError(
        'dayDate',
        "Tu ne peux poster une photo que pour aujourd'hui",
      );
    }

    const start = String(channel.startDate).slice(0, 10);
    const end = String(channel.endDate).slice(0, 10);
    if (today < start || today > end) {
      throw fieldError(
        'dayDate',
        "Le calendrier n'est pas en cours aujourd'hui",
      );
    }

    return this.postsService.create(channelId, req.user.userId, dto);
  }

  @Post(':postId/open')
  @HttpCode(204)
  async open(
    @Param('channelId') channelId: string,
    @Param('postId') postId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.assertMember(channelId, req.user.userId);
    await this.postsService.openPost(channelId, postId, req.user.userId);
  }

  @Get('days/:date')
  async findDayPosts(
    @Param('channelId') channelId: string,
    @Param('date') date: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.assertMember(channelId, req.user.userId);
    return this.postsService.findDayPosts(channelId, date, req.user.userId);
  }

  private async assertMember(channelId: string, userId: string): Promise<void> {
    const isMember = await this.channelsService.isMember(channelId, userId);
    if (!isMember) {
      throw new ForbiddenException('Tu ne fais pas partie de ce canal');
    }
  }

  private async getChannelAndToday(channelId: string) {
    const channel = await this.channelsService.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Canal introuvable');
    }
    const today = DateTime.now().setZone(channel.timezone).toISODate()!;
    return { channel, today };
  }
}
