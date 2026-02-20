import { PrismaModule } from '../../prisma/prisma.module';
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';

// Users feature module with protected user listing/detail endpoints.
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}
