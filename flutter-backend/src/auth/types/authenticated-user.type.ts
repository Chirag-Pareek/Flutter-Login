import { UserRole } from './user-role.type';

// Shape attached to `request.user` after JWT authentication succeeds.
export type AuthenticatedUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
};
