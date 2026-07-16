export interface Menu {
  id: string;
  label: string;
  icon: string;
  isActive?: boolean;
  children?: { id: string; label: string; isActive?: boolean }[];
}