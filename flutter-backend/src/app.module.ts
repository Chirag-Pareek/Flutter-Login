import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PaymentModule } from './payment/payment.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsageService } from './usage/usage.service';
import { UsageGuard } from './usage/usage.guard';
import { AiService } from './ai/ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UsageCronService } from './usage/usage.cron.service';
import { JwtAuthGuard } from './auth/jwt.guard';
import { AiController } from './ai/ai.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    AuthModule,
    UsersModule,
    PaymentModule,
    PrismaModule,
 ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
  ],

  controllers: [AppController , AiController],

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    UsageService,
    UsageGuard,  
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
     AiService,
     UsageCronService,
  ],
   exports: [UsageService , AiService],
})
export class AppModule {}
