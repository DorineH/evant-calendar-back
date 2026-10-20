import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  Patch,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JoinChannelDto } from './dto/join-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  create(@Body() dto: CreateChannelDto, @Req() req: AuthenticatedRequest) {
    return this.channelsService.create(dto, req.user.userId);
  }

  @Post('join')
  join(@Body() dto: JoinChannelDto, @Req() req: AuthenticatedRequest) {
    return this.channelsService.joinByInviteCode(
      dto.inviteCode,
      req.user.userId,
    );
  }

  @Get()
  findMyChannels(@Req() req: AuthenticatedRequest) {
    return this.channelsService.findUserChannels(req.user.userId);
  }

  @Get(':id/members')
  async findMembers(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const isMember = await this.channelsService.isMember(id, req.user.userId);
    if (!isMember) {
      throw new ForbiddenException('Tu ne fais pas partie de ce canal');
    }
    return this.channelsService.findMembers(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.channelsService.findOneForUser(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.channelsService.remove(id, req.user.userId);
  }
}
