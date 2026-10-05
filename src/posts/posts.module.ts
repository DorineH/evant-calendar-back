import { Module } from '@nestjs/common';
import { ChannelsModule } from '../channels/channels.module';
import { StorageModule } from '../storage/storage.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post]), ChannelsModule, StorageModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
