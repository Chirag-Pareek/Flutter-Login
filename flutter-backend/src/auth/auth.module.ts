import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';

// Auth module: registration, login, JWT validation, and guard exports.
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    // Make JWT the default passport strategy for guarded routes.
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Access token config with fallback values for local development.
        const secret =
          configService.get<string>('JWT_ACCESS_SECRET') ??
          configService.get<string>('JWT_SECRET') ??
          'supersecret';
        const expiresIn =
          configService.get<SignOptions['expiresIn']>('JWT_ACCESS_EXPIRES') ??
          '15m';

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtModule, PassportModule, JwtAuthGuard],
})
export class AuthModule {}
