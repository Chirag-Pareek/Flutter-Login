import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PaymentService } from './payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create-order')
  async createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    return this.paymentService.createOrder(req.user.sub, dto.planId);
  }

  @Post('verify')
  async verifyPayment(@Request() req, @Body() dto: VerifyPaymentDto) {

    console.log("FULL USER OBJECT:", req.user);

    return this.paymentService.verifyPayment(
      req.user.sub,
      dto.planId,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
  }

  @Post('subscription-status')
  async getStatus(@Request() req) {
    const sub = await this.paymentService.getActiveSubscription(req.user.sub);
    return { 
      hasSubscription: !!sub,
      plan: sub?.planId || null,
      messagesUsed: sub?.messagesUsed || 0,
      messageLimit: sub?.messageLimit || 10,  // Free limit
    };
  }
}
