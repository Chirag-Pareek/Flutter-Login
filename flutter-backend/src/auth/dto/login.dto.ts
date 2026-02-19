import { IsEmail, MinLength } from 'class-validator';

// Payload used by `POST /auth/login`.
export class LoginDto {
  @IsEmail()
  email!: string;

  // Minimum 6 chars for basic password policy.
  @MinLength(6)
  password!: string;
}
