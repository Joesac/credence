import { UserRole } from '@constants/roles.const';

export interface Menu {
  id: string;
  label: string;
  icon: string;
  isActive?: boolean;
  role?: UserRole;
  children?: { id: string; label: string; isActive?: boolean; role?: UserRole }[];
}