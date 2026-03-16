import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

// DTO for `POST /auth/refresh`.
export class RefreshTokenDto {
  // Raw refresh JWT sent by the client.
  @ValidateIf((dto: RefreshTokenDto) => !dto.refresh_token)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  refreshToken?: string;

  @ValidateIf((dto: RefreshTokenDto) => !dto.refreshToken)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  refresh_token?: string;
}
