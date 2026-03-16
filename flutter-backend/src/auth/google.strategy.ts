import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { deriveNameFromGoogle } from './users-utils';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL are required',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'], // Ensure profile scope for name & picture
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    void accessToken;
    void refreshToken;

    // 1️⃣ Extract & validate email
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    if (!email) {
      throw new UnauthorizedException('Google account email is missing');
    }

    // 2️⃣ Derive name using utility (first name only, fallback to email prefix)
    const name = profile.displayName?.trim() || deriveNameFromGoogle(profile);

    // 3️⃣ Extract profile picture (prefer high-res)
    const profilePicture = profile.photos?.[0]?.value;

    // 4️⃣ Return user data for JWT payload & frontend
    return {
      id: profile.id,
      email,
      name,                    // 👈 Auto-derived first name (e.g., "John" from "John Doe")
      provider: 'google',      // 👈 Critical for frontend Google badge logic
      profilePicture,          // 👈 For avatar display
      isVerified: true,        // Google emails are pre-verified
    };
  }
}
