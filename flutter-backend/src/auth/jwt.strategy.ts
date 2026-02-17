import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  userId: number;
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
    const jwtSecret = configService.get<string>('JWT_SECRET', 'supersecret');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const authHeader = req.headers.authorization ?? '';
    this.logger.debug(
      `JwtStrategy.validate invoked. Header present: ${authHeader.length > 0}`,
    );
    this.logger.debug(`JWT payload received for userId=${payload.userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('Token is valid but user no longer exists');
    }

    this.logger.debug(`JWT validation passed for userId=${user.id}`);
    return user;
  }
}
