import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type RefreshTokenPayload = {
  userId: number;
  iat?: number;
  exp?: number;
  role: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Registers a user with a hashed password and returns public profile fields.
  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  // Verifies credentials, issues tokens, and stores a hashed refresh token.
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        password: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const payload = { userId: user.id, role: user.role };

    // Access token settings: short lifetime for API authorization.
    const accessSecret =
      this.config.get<string>('JWT_ACCESS_SECRET') ?? 'supersecret';
    const accessExpires =
      this.config.get<SignOptions['expiresIn']>('JWT_ACCESS_EXPIRES') ?? '15m';

    // Refresh token settings: longer lifetime for session continuity.
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') ?? accessSecret;
    const refreshExpires =
      this.config.get<SignOptions['expiresIn']>('JWT_REFRESH_EXPIRES') ?? '7d';

    const access_token = this.jwt.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpires,
    });

    const refresh_token = this.jwt.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires,
    });

    const hashedRefresh = await bcrypt.hash(refresh_token, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefresh,
      },
    });

    this.logger.debug(`Login success for userId=${user.id}`);

    return {
      access_token,
      refresh_token,
    };
  }

  // Validates refresh token and returns a newly signed access token.
  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret =
        this.config.get<string>('JWT_REFRESH_SECRET') ?? 'supersecret';

      const payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          refreshToken: true,
        },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException();
      }

      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Keep payload minimal; include additional claims here only if needed.
      const newAccessToken = this.jwt.sign(
        { userId: user.id },
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'supersecret',
          expiresIn:
            this.config.get<SignOptions['expiresIn']>('JWT_ACCESS_EXPIRES') ??
            '15m',
        },
      );

      this.logger.debug(`Token refreshed for userId=${user.id}`);

      return {
        access_token: newAccessToken,
      };
    } catch {
      this.logger.warn('Refresh token failed');
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Logs out user by clearing the persisted refresh token hash.
  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });

    this.logger.debug(`User logged out userId=${userId}`);

    return {
      message: 'Logged out successfully',
    };
  }
}
