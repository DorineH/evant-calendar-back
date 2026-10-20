import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from './channel.entity';
import { ChannelMember } from './channel-member.entity';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { Post } from 'src/posts/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Channel, ChannelMember, Post])],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
