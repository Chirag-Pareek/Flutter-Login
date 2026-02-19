import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { GetUser } from './decorator/get-user.decorator';

// Authentication endpoints for account lifecycle and token management.
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Returns the authenticated user's email extracted from JWT context.
  @UseGuards(JwtAuthGuard)
  @Get('email')
  getEmail(@GetUser('email') email: string) {
    return email;
  }

  // Creates a new user account.
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Validates credentials and returns access + refresh tokens.
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Exchanges a valid refresh token for a new access token.
  @Post('refresh')
  refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  // Invalidates stored refresh token for the authenticated user.
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@GetUser('id') userId: number) {
    return this.authService.logout(userId);
  }
}
