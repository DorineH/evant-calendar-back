import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Post('register')
  register(@Body() dto: RegisterDeviceDto, @Req() req: AuthenticatedRequest) {
    return this.devicesService.register(req.user.userId, dto.expoPushToken);
  }
}
