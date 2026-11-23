import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Appelée par le pinger (cron-job.org) pour empêcher Render de mettre l'API en veille
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
