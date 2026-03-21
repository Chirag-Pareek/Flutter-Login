import { 
  Controller, 
  Post, 
  Get,              // ✅ Added for usage stats endpoint
  Body, 
  Request, 
  UseGuards,        // ✅ Added for guards
  HttpCode,
} from '@nestjs/common';
  // ✅ Added
import { UsageGuard, SkipUsageCheck } from '../usage/usage.guard';  // ✅ Added
import { UsageService } from '../usage/usage.service';  // ✅ Added
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AiService } from './ai.service';


@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,  // ✅ Keep your existing service
    private readonly usageService: UsageService,  // ✅ Added: UsageService
  ) {}

  // ✅ WRAPPED CHAT ENDPOINT — Usage limits enforced
  @Post('chat')
  @UseGuards(JwtAuthGuard, UsageGuard)  // ✅ Auth first, then usage check
  @HttpCode(200)
  async chat(@Request() req, @Body() dto: { message: string }) {
    // ✅ If we reach here, UsageGuard already verified limits
    // ✅ No manual checkLimit() needed — the guard handles it
    
    // 🔄 Your existing AI logic (UNCHANGED):
    const response = await this.aiService.generate(dto.message);
    
    // ✅ Increment usage AFTER successful operation (errors don't count)
    await this.usageService.incrementUsage(req.user.id);
    
    // ✅ Return your existing format + optional usage stats for frontend
    return { 
      success: true, 
      response,
      // Optional: Help Flutter show "15/20 messages used today"
      usage: await this.usageService.getUsageStats(req.user.id),
    };
  }

  // ✅ OPTIONAL: Usage stats endpoint for Flutter dashboard
  @Get('usage')
  @UseGuards(JwtAuthGuard)      // Auth required
  @SkipUsageCheck()             // Skip limit check for this endpoint
  async getUsage(@Request() req) {
    return this.usageService.getUsageStats(req.user.id);
  }
}