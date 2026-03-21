import { 
  Controller, 
  Post, 
  Get,
  Body, 
  Request, 
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { UsageGuard, SkipUsageCheck } from '../usage/usage.guard';
import { UsageService } from '../usage/usage.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
  ) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard, UsageGuard)
  @HttpCode(200)
  async chat(@Request() req, @Body() dto: { message: string }) {
    // UsageGuard has already verified limits via canActivate().
    // If execution reaches here, the user is authorized and within limits.

    // Execute your existing AI generation logic.
    const response = await this.aiService.generate(dto.message);

    // Increment usage counters ONLY after successful generation.
    // This ensures failed requests or errors do not consume the user's quota.
    await this.usageService.incrementUsage(req.user.id);

    // Return the response along with current usage statistics.
    // This allows the frontend to display progress (e.g., "15/20 messages used").
    const usageStats = await this.usageService.getUsageStats(req.user.id);

    return { 
      success: true, 
      response,
      usage: usageStats,
    };
  }

  // Optional endpoint for the frontend to fetch current usage stats
  // without consuming a request quota.
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @SkipUsageCheck()
  async getUsage(@Request() req) {
    return this.usageService.getUsageStats(req.user.id);
  }
}