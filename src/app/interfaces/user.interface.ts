export interface User {
  id: string;
  fullname: string;
  username: string;
  is_disabled: number;
  last_login: string | null;
  date_created: string;
  date_updated: string;
  is_synced: number;
}

export type AuthUser = User;
