import { IsNotEmpty, IsString } from 'class-validator';

// DTO for `POST /auth/refresh`.
export class RefreshTokenDto {
  // Raw refresh JWT sent by the client.
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}
