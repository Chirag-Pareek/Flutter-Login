import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from './usage.service';

@Injectable()
export class UsageGuard implements CanActivate {
  constructor(
    private readonly usageService: UsageService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow skipping limit check for specific routes (optional)
    const skip = this.reflector.get<boolean>('skipUsageCheck', context.getHandler());
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assumes JwtAuthGuard runs first

    if (!user?.id) {
      return true;
    }

    const result = await this.usageService.checkLimit(user.id);
    
    if (!result.allowed) {
      // Return helpful error with reset time for frontend countdown
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Usage limit exceeded',
        message: result.reason,
        resetIn: result.resetIn, // Frontend can show "Try again in X hours"
      });
    }

    return true;
  }
}

// ✅ Decorator to skip usage check on specific endpoints
export const SkipUsageCheck = () => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('skipUsageCheck', true, descriptor.value);
  };
};