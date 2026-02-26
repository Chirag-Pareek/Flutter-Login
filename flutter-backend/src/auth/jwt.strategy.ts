import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from './types/authenticated-user.type';
import { isUserRole } from './types/user-role.type';

type JwtPayload = {
  sub: number;
  role: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const accessSecret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is required');
    }

    // Strategy reads bearer token and verifies it with configured access secret.
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  // Resolves token payload into an application user object attached to request.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        provider: true,
        profilePicture: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Email is not verified');
    }

    if (!isUserRole(user.role)) {
      this.logger.warn(`Unknown role "${user.role}" for userId=${user.id}`);
      throw new UnauthorizedException('Invalid user role');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,      
    profilePicture: user.profilePicture, 
    };
  }
}
