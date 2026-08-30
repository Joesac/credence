export interface Menu {
  id: string;
  label: string;
  icon: string;
  isActive?: boolean;
  role?: 'Admin';
  children?: { id: string; label: string; isActive?: boolean; role?: 'Admin' }[];
}