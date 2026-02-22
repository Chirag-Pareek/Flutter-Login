import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

// Payload used by `POST /auth/register`.
export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value.trim()
      : value,
  )
  @IsOptional()
  @IsString()
  name?: string;

  // Normalize email before validation and persistence.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  // Minimum 8 chars plus uppercase/lowercase/number/symbol.
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, {
    message:
      'Use a strong password: at least 8 characters with uppercase, lowercase, number, and special character.',
  })
  password!: string;
}
