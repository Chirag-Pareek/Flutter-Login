import { Transform } from 'class-transformer';
import { IsEmail, MinLength } from 'class-validator';

// Payload used by `POST /auth/login`.
export class LoginDto {
  // Normalize email to avoid case-sensitive credential mismatches.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  // Align login validation with register validation.
  @MinLength(8)
  password!: string;
}
