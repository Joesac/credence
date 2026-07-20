export interface User {
  id: string;
  fullname: string;
  username: string;
  date_created: string;
  date_updated: string;
  is_synced: number;
}

export type AuthUser = User;
