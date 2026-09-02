export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  targetId: string | null;
  targetName: string | null;
  action: string;
  details: string | null;
  dateCreated: string;
}
