import { IsIn, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsIn(['starter', 'pro'])
  planId!: 'starter' | 'pro';
}
