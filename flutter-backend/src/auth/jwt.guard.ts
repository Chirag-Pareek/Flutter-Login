import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from './types/authenticated-user.type';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Delegates JWT auth checks to Passport strategy.
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // Normalizes auth errors to avoid leaking token verification details.
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    void info;
    void context;

    if (err || !user) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return user;
  }
}
