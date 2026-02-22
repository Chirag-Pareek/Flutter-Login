import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { GetUser } from './decorator/get-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

type GoogleOAuthRequest = {
  user: {
    email: string;
    name?: string | null;
  };
};

// Authentication endpoints for account lifecycle and token management.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Returns the authenticated user's email extracted from JWT context.
  @UseGuards(JwtAuthGuard)
  @Get('email')
  getEmail(@GetUser('email') email: string) {
    return email;
  }

  // Creates a new user account.
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Validates the verification token sent by email.
  @Get('verify')
  verifyEmail(@Query() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  // Validates credentials and returns access + refresh tokens.
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Exchanges a valid refresh token for a new access token.
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  // Invalidates stored refresh token for the authenticated user.
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@GetUser('id') userId: number) {
    return this.authService.logout(userId);
  }

  // Sends password reset email without revealing account existence.
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  // Resets password with a valid, non-expired reset token.
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // Google signup and login endpoints using Passport's Google OAuth strategy.
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: GoogleOAuthRequest, @Res() res: Response) {
    const { access_token, refresh_token } = await this.authService.googleLogin(
      req.user,
    );

    const access = encodeURIComponent(access_token);
    const refresh = encodeURIComponent(refresh_token);
    res.redirect(`myapp://auth-success?access=${access}&refresh=${refresh}`);
  }
}
