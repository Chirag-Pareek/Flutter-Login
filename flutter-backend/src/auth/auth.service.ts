import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { sendResetEmail, sendVerificationEmail } from './mail.service';
import { UserRole, isUserRole } from './types/user-role.type';

type TokenPayload = {
  sub: number;
  role: UserRole;
  iat?: number;
  exp?: number;
};

type GoogleAuthUser = {
  email: string;
  name?: string | null;
};

// Fixed bcrypt hash used for timing-safe login checks when user is not found.
const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.O6YzM4z6fM8m4jwELyhlHLLJoPLD114';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Centralized token settings loaded once on boot.
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpires: SignOptions['expiresIn'];
  private readonly refreshTokenExpires: SignOptions['expiresIn'];
  private readonly bcryptSaltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessTokenSecret = this.getRequiredConfig('JWT_ACCESS_SECRET');
    this.refreshTokenSecret = this.getRequiredConfig('JWT_REFRESH_SECRET');
    this.accessTokenExpires =
      this.config.get<SignOptions['expiresIn']>('JWT_ACCESS_EXPIRES') ?? '15m';
    this.refreshTokenExpires =
      this.config.get<SignOptions['expiresIn']>('JWT_REFRESH_EXPIRES') ?? '7d';

    const saltRounds = Number(
      this.config.get<string>('BCRYPT_SALT_ROUNDS') ?? '12',
    );
    this.bcryptSaltRounds =
      Number.isInteger(saltRounds) && saltRounds >= 10 && saltRounds <= 15
        ? saltRounds
        : 12;
  }

  // Registers a new account and sends a verification email.
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const normalizedName = dto.name?.trim() || null;
    const hashedPassword = await bcrypt.hash(
      dto.password,
      this.bcryptSaltRounds,
    );

    const verificationToken = this.generateOpaqueToken();
    const verifyTokenHash = this.hashOpaqueToken(verificationToken);
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered. Please login.');
      }

      const user = await this.prisma.user.create({
        data: {
          name: normalizedName,
          email,
          password: hashedPassword,
          verifyToken: verifyTokenHash,
          verifyTokenExpiry,
          isVerified: false,
          provider: 'email',
        },
        select: { id: true, name: true, email: true },
      });

      const verificationEmailSent = await sendVerificationEmail(
        user.email,
        verificationToken,
      );

      console.log('TOKEN:', verificationToken);

      if (!verificationEmailSent) {
        this.logger.warn(`Verification email failed for ${user.email}`);
      }

      return {
        message: verificationEmailSent
          ? 'Registration successful. Please verify your email.'
          : 'Registration successful. Verification email could not be sent.',
        user,
        verificationEmailSent,
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;

      if (this.isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Email already registered. Please login.');
      }

      this.logger.error(
        'Registration failed',
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException('Unable to register user');
    }
  }

  // Verifies user email using a one-time token.
  async verifyEmail(token: string) {
    const tokenHash = this.hashOpaqueToken(token.trim());

    const user = await this.prisma.user.findFirst({
      where: {
        verifyToken: tokenHash,
        verifyTokenExpiry: { gte: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verifyToken: null,
        verifyTokenExpiry: null,
      },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  // Authenticates user credentials and returns fresh token pair.
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: dto.email.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        password: true,
        role: true,
        isVerified: true,
      },
    });

    // Run compare even if user is unknown to reduce timing side-channels.
    const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
    const isPasswordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: TokenPayload = {
      sub: user.id,
      role: this.normalizeRole(user.role),
    };

    const access_token = this.signAccessToken(payload);
    const refresh_token = this.signRefreshToken(payload);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: await bcrypt.hash(refresh_token, this.bcryptSaltRounds),
      },
    });

    this.logger.debug(`Login success for userId=${user.id}`);

    return {
      access_token,
      refresh_token,
    };
  }

  // Rotates refresh token and returns a new token pair.
  async refreshToken(refreshToken: string) {
    const token = refreshToken.trim();

    try {
      const payload = this.jwt.verify<TokenPayload>(token, {
        secret: this.refreshTokenSecret,
      });

      if (!payload?.sub || typeof payload.sub !== 'number') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          role: true,
          isVerified: true,
          refreshToken: true,
        },
      });

      if (!user || !user.isVerified || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isMatch = await bcrypt.compare(token, user.refreshToken);

      // If a signed token does not match the stored hash, treat as reuse attempt.
      if (!isMatch) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });

        throw new UnauthorizedException('Invalid refresh token');
      }

      const nextPayload: TokenPayload = {
        sub: user.id,
        role: this.normalizeRole(user.role),
      };
      const newAccessToken = this.signAccessToken(nextPayload);
      const newRefreshToken = this.signRefreshToken(nextPayload);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken: await bcrypt.hash(
            newRefreshToken,
            this.bcryptSaltRounds,
          ),
        },
      });

      this.logger.debug(`Token rotated for userId=${user.id}`);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn('Refresh token validation failed');
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Logs user out by clearing persisted refresh token hash.
  async logout(userId: number) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });

    this.logger.debug(`User logged out userId=${userId}`);

    return {
      message: 'Logged out successfully',
    };
  }

  // Requests password reset without leaking whether user exists.
  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return {
        message: 'If the account exists, a reset link has been sent.',
      };
    }

    const token = this.generateOpaqueToken();
    const resetTokenHash = this.hashOpaqueToken(token);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry: expiry,
      },
    });

    const resetEmailSent = await sendResetEmail(user.email, token);

    if (!resetEmailSent) {
      this.logger.warn(
        `Password reset email delivery failed for userId=${user.id}`,
      );
    }

    return {
      message: 'If the account exists, a reset link has been sent.',
    };
  }

  // Resets password using a valid, non-expired reset token.
  async resetPassword(token: string, newPassword: string) {
    const resetTokenHash = this.hashOpaqueToken(token.trim());

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: { gte: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, this.bcryptSaltRounds),
        resetToken: null,
        resetTokenExpiry: null,
        refreshToken: null,
      },
    });

    return {
      message: 'Password reset successful',
    };
  }

  // Signs a short-lived access token.
  private signAccessToken(payload: TokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpires,
    });
  }

  // Signs a long-lived refresh token.
  private signRefreshToken(payload: TokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpires,
    });
  }

  // Generates a random token for verification/reset URLs.
  private generateOpaqueToken(): string {
    return randomBytes(32).toString('hex');
  }

  // Stores only deterministic token hashes in DB (never raw token values).
  private hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Ensures only known role values are embedded into JWTs.
  private normalizeRole(role: string): UserRole {
    if (isUserRole(role)) {
      return role;
    }

    this.logger.warn(
      `Unknown role "${role}" encountered. Falling back to user.`,
    );
    return UserRole.USER;
  }

  // Type guard for Prisma unique constraint errors.
  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return (
      !!error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  // Reads mandatory env vars and fails fast if missing.
  private getRequiredConfig(key: string): string {
    const value = this.config.get<string>(key);

    if (!value) {
      throw new Error(`${key} is required`);
    }

    return value;
  }

  // Handles Google OAuth callback user and returns an auth token pair.
  async googleLogin(profile: GoogleAuthUser) {
    const email = profile.email.trim().toLowerCase();
    const fallbackName = email.split('@')[0] ?? 'Google User';
    const name = profile.name?.trim() || fallbackName;

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
      },
    });

    const resolvedUser = user
      ? user
      : await this.prisma.user.create({
          data: {
            email,
            name,
            provider: AuthProvider.google,
            isVerified: true,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isVerified: true,
          },
        });

    if (!resolvedUser.isVerified) {
      await this.prisma.user.update({
        where: { id: resolvedUser.id },
        data: { isVerified: true },
      });
    }

    const payload: TokenPayload = {
      sub: resolvedUser.id,
      role: this.normalizeRole(resolvedUser.role),
    };

    const access_token = this.signAccessToken(payload);
    const refresh_token = this.signRefreshToken(payload);

    await this.prisma.user.update({
      where: { id: resolvedUser.id },
      data: {
        refreshToken: await bcrypt.hash(refresh_token, this.bcryptSaltRounds),
      },
    });

    return {
      access_token,
      refresh_token,
      user: {
        id: resolvedUser.id,
        email: resolvedUser.email,
        name: resolvedUser.name,
      },
    };
  }
}
