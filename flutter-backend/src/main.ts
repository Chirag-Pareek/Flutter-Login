import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Application entry point.
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Keep production logs focused while allowing verbose logs in development.
    logger:
      process.env.NODE_ENV === 'production'
        ? ['log', 'warn', 'error']
        : ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  // Global request validation for all DTO-based inputs.
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip unexpected properties from incoming payloads.
      whitelist: true,
      // Convert payload values to DTO target types when possible.
      transform: true,
      // Reject payloads that include properties not defined in DTOs.
      forbidNonWhitelisted: true,
      // Return validation details so clients can show actionable form errors.
      disableErrorMessages: false,
    }),
  );
  app.enableCors({
    origin: '*',
  });
  await app.listen(process.env.PORT || 3000);
}

void bootstrap();
