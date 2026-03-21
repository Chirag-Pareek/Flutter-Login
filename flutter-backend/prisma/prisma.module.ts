import { Module , Global} from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Shared module that exposes PrismaService for database access.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
