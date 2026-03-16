import {
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
import { AuthGuard } from '@nestjs/passport';
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

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('verify')
  verifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.verifyEmail(query.token);
  }

  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @HttpCode(200)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@GetUser('id') userId: number) {
    return this.authService.logout(userId);
  }

  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return undefined;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
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
    const fragment = new URLSearchParams({
      access_token: authResult.access_token,
      refresh_token: authResult.refresh_token,
      user_id: String(authResult.user.id),
      email: authResult.user.email,
      name: authResult.user.name ?? '',
      provider: authResult.user.provider,
      profile_picture: authResult.user.profilePicture ?? '',
    }).toString();

    const redirectUrl = new URL(callbackUrl);
    redirectUrl.hash = fragment;
    return redirectUrl.toString();
  }
}
