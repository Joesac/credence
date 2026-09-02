import { USER_ROLES } from '@constants/roles.const';

export type UserRole = typeof USER_ROLES.Admin | typeof USER_ROLES.Regular;

export interface User {
  id: string;
  fullname: string;
  username: string;
  is_disabled: number;
  role: UserRole;
  last_login: string | null;
  date_created: string;
  date_updated: string;
  is_synced: number;
}

export type AuthUser = User;
