import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

// Payload used by `POST /auth/register`.
export class RegisterDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  // At least 8 chars plus uppercase/lowercase/number/symbol.
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).+$/, {
    message: 'Password must contain uppercase, lowercase and number',
  })
  password!: string;
}
