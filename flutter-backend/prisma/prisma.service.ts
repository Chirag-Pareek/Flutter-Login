import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Establish a DB connection once the Nest module is initialized.
  async onModuleInit() {
    await this.$connect();
  }

  // Close DB connections when the Nest module is destroyed.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
