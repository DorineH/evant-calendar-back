import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class StorageService {
  constructor(private configService: ConfigService) {
    const secret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    console.log(
      'SECRET length:',
      secret?.length,
      'SECRET:',
      JSON.stringify(secret),
    );
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  generateUploadSignature(folder: string) {
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = { timestamp, folder };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      this.configService.get<string>('CLOUDINARY_API_SECRET')!,
    );

    return {
      signature,
      timestamp,
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      apiKey: this.configService.get<string>('CLOUDINARY_API_KEY'),
      folder,
    };
  }
}
