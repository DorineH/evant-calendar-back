import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (validationErrors) => {
        const errors: Record<string, string> = {};
        for (const e of validationErrors) {
          // Un seul message par champ : le premier
          errors[e.property] =
            Object.values(e.constraints ?? {})[0] ?? 'Valeur invalide';
        }
        return new BadRequestException({
          statusCode: 400,
          message: 'Certains champs sont invalides',
          errors,
        });
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
