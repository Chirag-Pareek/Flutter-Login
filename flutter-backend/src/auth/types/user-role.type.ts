// Allowed application roles.
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// Runtime guard to safely coerce persisted role values.
export const isUserRole = (value: string): value is UserRole =>
  Object.values(UserRole).includes(value as UserRole);
