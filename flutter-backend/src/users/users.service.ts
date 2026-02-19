import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all users with a safe public response shape.
   * Update `select` to expose more or fewer user fields.
   */
  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  /**
   * Returns a single user by numeric `id`.
   * Update `where` to query by another unique field (for example, `email`).
   * Update `select` to control fields returned to callers.
   */
  async getUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }
}
