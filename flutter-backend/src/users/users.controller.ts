import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /users
  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  // GET /users/1
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getUserById(Number(id));
  }
}
