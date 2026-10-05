import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChannelsService } from '../channels/channels.service';
import { StorageService } from '../storage/storage.service';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

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
    // const isMember = await this.channelsService.isMember(
    //   channelId,
    //   req.user.userId,
    // );
    // if (!isMember) {
    //   throw new ForbiddenException('Tu ne fais pas partie de ce canal');
    // }

    await this.assertMember(channelId, req.user.userId);

    const today = new Date().toISOString().split('T')[0];
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
    return this.postsService.create(channelId, req.user.userId, dto);
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
}
