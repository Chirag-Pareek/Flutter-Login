import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  override getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const isCallback = request.url.includes('/callback');

    if (isCallback) {
      return { session: false };
    }

    return {
      session: false,
      scope: ['email', 'profile'],
      accessType: 'offline',
      prompt: 'consent select_account',
    };
  }
}
