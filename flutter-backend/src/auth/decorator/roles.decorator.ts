import { SetMetadata } from '@nestjs/common';

// Attaches allowed roles metadata consumed by `RolesGuard`.
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
