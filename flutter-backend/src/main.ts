import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

// Application entry point.
async function bootstrap() {
  const collectValidationMessages = (errors: ValidationError[]): string[] => {
    const messages: string[] = [];
    const stack = [...errors];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;

      if (current.constraints) {
        messages.push(...Object.values(current.constraints));
      }

      if (current.children?.length) {
        stack.push(...current.children);
      }
    }

    return messages;
  };

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
      exceptionFactory: (errors: ValidationError[]) => {
        const [firstMessage] = collectValidationMessages(errors);
        return new BadRequestException({
          statusCode: 400,
          error: firstMessage ?? 'Validation failed',
        });
      },
    }),
  );
  app.enableCors({
    origin: '*',
  });
  await app.listen(process.env.PORT || 3000);
}

void bootstrap();
