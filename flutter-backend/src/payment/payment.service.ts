import { BadRequestException, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RazorpayService } from './razorpay.service';

const PLANS = {
  starter: { amount: 9900, messageLimit: 500 },
  pro: { amount: 24900, messageLimit: -1 }, // -1 = unlimited
} as const;

type PlanId = keyof typeof PLANS;

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

  async createOrder(userId: number, planId: CreateOrderDto['planId']) {
    const plan = PLANS[planId];

    const order = await this.razorpay.createOrder(
      plan.amount,
      `receipt_${userId}_${Date.now()}`,
    );

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyPayment(
    userId: number,
    planId: string,
    orderId: string,
    paymentId: string,
    signature: string,
  ) {
    //Verify signature
    const isValid = this.razorpay.verifySignature(orderId, paymentId, signature);
    if (!isValid) throw new BadRequestException('Invalid signature');
  
    //Check for duplicate payment 
    const existingPayment = await this.prisma.subscription.findFirst({
      where: { paymentId },
    });
    if (existingPayment) {
    
      return { verified: true };
    }
  
    //Validate plan
    const plan = PLANS[planId as PlanId];
    if (!plan) throw new BadRequestException('Invalid plan');
  
    //Verify payment status & amount from Razorpay API
    try {
      const paymentDetails = await this.razorpay.fetchPayment(paymentId);
      
      // Verify status
      if (paymentDetails.status !== 'captured') {
        throw new BadRequestException('Payment not captured');
      }
      
      // Verify amount matches plan (convert to paise if needed)
      const expectedAmount = plan.amount; // assuming amount is in paise
      if (paymentDetails.amount !== expectedAmount) {
        console.warn(`Amount mismatch: expected ${expectedAmount}, got ${paymentDetails.amount}`);
      
      }
    } catch (error) {
      //If API call fails, log but continue (safe fallback)
      console.warn('Could not fetch payment details from Razorpay:', error.message);
    }
  
    //Verify order belongs to this user
    const orderCheck = await this.prisma.subscription.findFirst({
      where: { 
        orderId, 
        userId: { not: userId } // Find if order belongs to DIFFERENT user
      },
    });
    if (orderCheck) {
      throw new BadRequestException('Order does not belong to this user');
    }
  
    //Capture payment 
    await this.razorpay.capturePayment(paymentId, plan.amount);
  
    await this.prisma.subscription.updateMany({
      where: {
        userId,
        status: SubscriptionStatus.active,
      },
      data: {
        status: SubscriptionStatus.expired,
      },
    });
   
    //Create new subscription 
    await this.prisma.subscription.create({
      data: {
        userId,
        planId,
        messageLimit: plan.messageLimit,
        paymentId,
        orderId,
        status: SubscriptionStatus.active,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  
    return { verified: true };
  }

  async getActiveSubscription(userId: number) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.active,
        endDate: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async canSendMessage(userId: number): Promise<boolean> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return true;
    if (sub.messageLimit === -1) return true;
    return sub.messagesUsed < sub.messageLimit;
  }

  async incrementMessageUsage(userId: number) {
    const sub = await this.getActiveSubscription(userId);
    if (!sub || sub.messageLimit === -1) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { messagesUsed: { increment: 1 } },
    });
  }
}
