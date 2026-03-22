import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
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
    return this.paymentService.createOrder(req.user.id, dto.planId);
  }

  @Post('verify')
  async verifyPayment(@Request() req, @Body() dto: VerifyPaymentDto) {
    console.log("FULL USER OBJECT:", req.user);
    return this.paymentService.verifyPayment(
      req.user.id,
      dto.planId,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
  }


  @Get('subscription-status')
  async getStatus(@Request() req) {
    return this.paymentService.getSubscriptionStatus(req.user.id);
  }
}