import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  // Adds request-level diagnostics before passport JWT validation runs.
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('No Authorization header received');
    } else if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      this.logger.debug(`Bearer token received: ${token.slice(0, 12)}...`);
    } else {
      this.logger.warn('Authorization header is present but not Bearer format');
    }

    return super.canActivate(context);
  }

  // Standardizes authentication failure logging and error messages.
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: { message?: string } | undefined,
  ): TUser {
    if (err || !user) {
      const reason =
        (err as { message?: string })?.message ??
        info?.message ??
        'Unauthorized';
      this.logger.warn(`JWT authentication failed: ${reason}`);
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException(reason);
    }

    this.logger.debug('JWT authentication passed');
    return user;
  }
}
