import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users: returns all users (JWT required).
  @Get()
  getUsers() {
    return this.usersService.getUsers();
  }

  // GET /users/admin: restricted to users with `admin` role.
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin')
  getAdminData() {
    return 'Only admin can see this';
  }

  // GET /users/:id: returns one user by numeric id.
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getUserById(Number(id));
  }
}
