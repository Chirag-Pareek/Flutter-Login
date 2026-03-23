import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  // Plan limits configuration (case-insensitive keys)
  private readonly PLAN_LIMITS = {
    'BASIC': { daily: 20, monthly: null },
    'STARTER': { daily: null, monthly: 2000 },
    'PRO': { daily: null, monthly: null }, // Unlimited
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has exceeded their plan limits
   * Auto-resets daily/monthly counters if needed
   * Returns: { allowed: true } OR { allowed: false, reason, resetIn }
   */
  async checkLimit(userId: number): Promise<{ allowed: true } | { allowed: false; reason: string; resetIn?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        dailyUsage: true,
        monthlyUsage: true,
        lastDailyReset: true,
        lastMonthlyReset: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const now = new Date();
    const updates: Record<string, any> = {};
    let needsUpdate = false;

    // 🔄 Reset daily usage if new day (UTC)
    if (!user.lastDailyReset || this.isNewDay(user.lastDailyReset, now)) {
      updates.dailyUsage = 0;
      updates.lastDailyReset = now;
      needsUpdate = true;
      this.logger.debug(`Reset daily usage for user ${userId}`);
    }

    // 🔄 Reset monthly usage if new month (UTC)
    if (!user.lastMonthlyReset || this.isNewMonth(user.lastMonthlyReset, now)) {
      updates.monthlyUsage = 0;
      updates.lastMonthlyReset = now;
      needsUpdate = true;
      this.logger.debug(`Reset monthly usage for user ${userId}`);
    }

    // 💾 Save resets if needed
    if (needsUpdate) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updates,
      });
      // Update local user object with new values
      Object.assign(user, updates);
    }

    // 📊 Get limits for user's plan (case-insensitive)
    const planKey = user.plan?.toUpperCase() || 'BASIC';
    const limits = this.PLAN_LIMITS[planKey as keyof typeof this.PLAN_LIMITS];
    
    if (!limits) {
      this.logger.warn(`Unknown plan type: ${user.plan}, defaulting to BASIC`);
      return { allowed: true }; // Fail open for unknown plans
    }

    // ✅ PRO plan = unlimited
    if (planKey === 'PRO') {
      return { allowed: true };
    }

    // 🔢 Check daily limit
    if (limits.daily !== null && user.dailyUsage >= limits.daily) {
      const resetIn = this.getNextResetTime('daily', now);
      return {
        allowed: false,
        reason: `Daily limit of ${limits.daily} requests reached`,
        resetIn,
      };
    }

    // 🔢 Check monthly limit
    if (limits.monthly !== null && user.monthlyUsage >= limits.monthly) {
      const resetIn = this.getNextResetTime('monthly', now);
      return {
        allowed: false,
        reason: `Monthly limit of ${limits.monthly} requests reached`,
        resetIn,
      };
    }

    return { allowed: true };
  }

  /**
   * Increment usage counters for a user (call AFTER successful operation)
   */
  async incrementUsage(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        dailyUsage: { increment: 1 },
        monthlyUsage: { increment: 1 },
      },
    });

    // Also sync the active subscription's messagesUsed for UI dashboards
    await this.prisma.subscription.updateMany({
      where: { 
        userId,
        status: SubscriptionStatus.active,
      },
      data: {
        messagesUsed: { increment: 1 },
      },
    });
  }

  /**
   * Get user's current usage stats (for dashboard/API response)
   */
  async getUsageStats(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        dailyUsage: true,
        monthlyUsage: true,
        lastDailyReset: true,
        lastMonthlyReset: true,
      },
    });

    const planKey = user?.plan?.toUpperCase() || 'BASIC';
    const limits = this.PLAN_LIMITS[planKey as keyof typeof this.PLAN_LIMITS] || this.PLAN_LIMITS.BASIC;

    return {
      plan: user?.plan || 'BASIC',
      daily: {
        used: user?.dailyUsage || 0,
        limit: limits.daily,
        remaining: limits.daily ? Math.max(0, limits.daily - (user?.dailyUsage || 0)) : null,
      },
      monthly: {
        used: user?.monthlyUsage || 0,
        limit: limits.monthly,
        remaining: limits.monthly ? Math.max(0, limits.monthly - (user?.monthlyUsage || 0)) : null,
      },
      resets: {
        daily: user?.lastDailyReset,
        monthly: user?.lastMonthlyReset,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods (Private)
  // ─────────────────────────────────────────────────────────────

  private isNewDay(lastReset: Date, now: Date): boolean {
    return lastReset.getUTCDate() !== now.getUTCDate() ||
           lastReset.getUTCMonth() !== now.getUTCMonth() ||
           lastReset.getUTCFullYear() !== now.getUTCFullYear();
  }

  private isNewMonth(lastReset: Date, now: Date): boolean {
    return lastReset.getUTCMonth() !== now.getUTCMonth() ||
           lastReset.getUTCFullYear() !== now.getUTCFullYear();
  }

  private getNextResetTime(type: 'daily' | 'monthly', now: Date): string {
    if (type === 'daily') {
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    } else {
      const nextMonth = new Date(now);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      nextMonth.setUTCDate(1);
      nextMonth.setUTCHours(0, 0, 0, 0);
      return nextMonth.toISOString();
    }
  }
}