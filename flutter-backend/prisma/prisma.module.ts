import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Shared module that exposes PrismaService for database access.
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
