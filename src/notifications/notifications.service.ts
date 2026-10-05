import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { DateTime } from 'luxon';
import { ChannelsService } from '../channels/channels.service';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo = new Expo();

  constructor(
    private channelsService: ChannelsService,
    private devicesService: DevicesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkChannelOpenings(): Promise<void> {
    this.logger.log('Cron check...');
    const channels = await this.channelsService.findAll();

    for (const channel of channels) {
      const nowInChannelTz = DateTime.now().setZone(channel.timezone);
      const currentDate = nowInChannelTz.toISODate();
      const currentTime = nowInChannelTz.toFormat('HH:mm');
      const channelOpenTime = channel.openTime.slice(0, 5); // "18:00:00" → "18:00"

      const isWithinPeriod =
        currentDate! >= channel.startDate && currentDate! <= channel.endDate;
      const isOpeningNow = currentTime === channelOpenTime;

      if (isWithinPeriod && isOpeningNow) {
        await this.notifyChannelMembers(channel.id, channel.name);
      }
    }
  }

  private async notifyChannelMembers(
    channelId: string,
    channelName: string,
  ): Promise<void> {
    const members = await this.channelsService.findMembers(channelId);
    const userIds = members.map((m) => m.user.id);
    const tokens = await this.devicesService.findTokensForUsers(userIds);

    const messages: ExpoPushMessage[] = tokens
      .filter((token) => Expo.isExpoPushToken(token))
      .map((token) => ({
        to: token,
        sound: 'default',
        title: `${channelName} est ouvert ! 🎄`,
        body: 'La case du jour est déverrouillée, va voir les photos.',
        data: { channelId },
      }));

    if (messages.length === 0) return;

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        this.logger.error('Erreur envoi notifications push', error);
      }
    }
  }
}
