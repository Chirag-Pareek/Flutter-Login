import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit
{
  // Establish a DB connection once the Nest module is initialized.
  async onModuleInit() {
    await this.$connect();
  }
}
