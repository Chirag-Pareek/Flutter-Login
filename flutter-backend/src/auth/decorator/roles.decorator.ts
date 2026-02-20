import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../types/user-role.type';

// Shared metadata key used by roles decorator + guard.
export const ROLES_KEY = 'roles';

// Attaches allowed roles metadata consumed by `RolesGuard`.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
