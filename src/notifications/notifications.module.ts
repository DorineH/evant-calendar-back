import { Module } from '@nestjs/common';
import { ChannelsModule } from '../channels/channels.module';
import { DevicesModule } from '../devices/devices.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [ChannelsModule, DevicesModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}
