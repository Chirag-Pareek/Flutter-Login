import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

// DTO for `POST /auth/forgot-password`.
export class ForgotPasswordDto {
  // Normalize email so lookups are deterministic.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;
}
