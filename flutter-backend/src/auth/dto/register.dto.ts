import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

// Payload used by `POST /auth/register`.
export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  name!: string;

  // Normalize email before validation and persistence.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  // At least 8 chars plus uppercase/lowercase/number/symbol.
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).+$/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;
}
