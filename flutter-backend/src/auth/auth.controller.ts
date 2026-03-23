import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GetUser } from './decorator/get-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from './jwt.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleAuthGuard } from './google-auth.guard';
import { Public } from  '../auth/decorator/public.decorator';
import { Throttle } from '@nestjs/throttler';

type GoogleCallbackRequest = Request & {
  user?: {
    email: string;
    name?: string | null;
    profilePicture?: string | null;
  };
};

type GoogleAuthResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    name: string | null;
    provider: string;
    profilePicture: string | null;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

@Public()
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Post('register')
register(@Body() dto: RegisterDto) {
  return this.authService.register(dto);
}

@Public()
@Throttle({ default: { limit: 5, ttl: 60000 } })
@HttpCode(200)
@Post('login')
login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}

@Public()
  @Get('verify')
  verifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.verifyEmail(query.token);
  }
@Public()
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    const refreshToken = dto.refreshToken ?? dto.refresh_token;
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }
    return this.authService.refreshToken(refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@GetUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  @HttpCode(200)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@GetUser('id') userId: number) {
    return this.authService.logout(userId);
  }
@Public()
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }
@Public()
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
@Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    return undefined;
  }
@Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: GoogleCallbackRequest,
    @Res() res: Response,
  ) {
    const authResult = await this.authService.googleLogin({
      email: req.user!.email,
      name: req.user?.name,
      profilePicture: req.user?.profilePicture,
    });

    const appCallbackUrl = process.env.GOOGLE_APP_CALLBACK_URL?.trim();
    if (appCallbackUrl) {
      return res.redirect(302, this.buildGoogleAppRedirect(appCallbackUrl, authResult));
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.json(authResult);
  }

  private buildGoogleAppRedirect(
    callbackUrl: string,
    authResult: GoogleAuthResponse,
  ) {
    const redirectUrl = new URL(callbackUrl);
    redirectUrl.search = new URLSearchParams({
      access_token: authResult.access_token,
      refresh_token: authResult.refresh_token,
      user_id: String(authResult.user.id),
      email: authResult.user.email,
      name: authResult.user.name ?? '',
      provider: authResult.user.provider,
      profile_picture: authResult.user.profilePicture ?? '',
    }).toString();
    return redirectUrl.toString();
  }
}
