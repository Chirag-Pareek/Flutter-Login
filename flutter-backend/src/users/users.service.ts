import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ✅ GET ALL USERS
  async getUsers() {
    const users = await this.prisma.user.findMany();
    return users.map(({ password, ...user }) => user);
  }

  // ✅ GET SINGLE USER
  async getUserById(id: number) {
    const users = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!users) return null;

    const { password, ...result } = users;
    return result;
  }
}
