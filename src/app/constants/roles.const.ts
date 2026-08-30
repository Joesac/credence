export const USER_ROLES = {
  Admin: 'Admin',
  Regular: 'Regular',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
