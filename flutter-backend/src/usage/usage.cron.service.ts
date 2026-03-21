import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsageCronService {
  private readonly logger = new Logger(UsageCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Reset daily usage at midnight UTC
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyUsage() {
    this.logger.log('Starting daily usage reset');

    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    try {
      const result = await this.prisma.user.updateMany({
        where: {
          plan: { notIn: ['PRO', 'Pro', 'pro'] }, // Skip unlimited users
          lastDailyReset: { lt: startOfDay },
        },
        data: {
          dailyUsage: 0,
          lastDailyReset: new Date(),
        },
      });

      this.logger.log(`Daily usage reset complete: ${result.count} users updated`);
    } catch (error) {
      this.logger.error('Failed to reset daily usage', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Reset monthly usage on the 1st of each month at midnight UTC
  @Cron('0 0 1 * *')
  async resetMonthlyUsage() {
    this.logger.log('Starting monthly usage reset');

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    try {
      const result = await this.prisma.user.updateMany({
        where: {
          plan: { notIn: ['PRO', 'Pro', 'pro'] },
          lastMonthlyReset: { lt: startOfMonth },
        },
        data: {
          monthlyUsage: 0,
          lastMonthlyReset: new Date(),
        },
      });

      this.logger.log(`Monthly usage reset complete: ${result.count} users updated`);
    } catch (error) {
      this.logger.error('Failed to reset monthly usage', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Optional: Cleanup expired subscriptions daily
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredSubscriptions() {
    this.logger.log('Starting expired subscription cleanup');

    try {
      const result = await this.prisma.subscription.updateMany({
        where: {
          status: 'active',
          endDate: { lt: new Date() },
        },
        data: {
          status: 'expired',
        },
      });

      this.logger.log(`Cleanup complete: ${result.count} subscriptions expired`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired subscriptions', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}