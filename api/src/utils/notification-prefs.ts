/**
 * Shared notification preference helpers for the Credence cloud API.
 * The push sender must call `shouldNotify` before dispatching a push so
 * members who opted out of a category (or all pushes) are never pinged.
 */

export type NotificationType = 'deposit' | 'withdrawal' | 'loan' | 'repayment' | 'reminder';

export interface NotificationPrefsRow {
  push_enabled: boolean;
  deposit_alerts: boolean;
  withdrawal_alerts: boolean;
  loan_alerts: boolean;
  reminder_alerts: boolean;
}

export interface NotificationPrefs {
  pushEnabled: boolean;
  depositAlerts: boolean;
  withdrawalAlerts: boolean;
  loanAlerts: boolean;
  reminderAlerts: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  pushEnabled: true,
  depositAlerts: true,
  withdrawalAlerts: true,
  loanAlerts: true,
  reminderAlerts: true,
};

/** Map a DB row (or partial) to the camelCase API shape, defaulting to on. */
export function toApiPrefs(row?: Partial<NotificationPrefsRow> | null): NotificationPrefs {
  return {
    pushEnabled: row?.push_enabled ?? true,
    depositAlerts: row?.deposit_alerts ?? true,
    withdrawalAlerts: row?.withdrawal_alerts ?? true,
    loanAlerts: row?.loan_alerts ?? true,
    reminderAlerts: row?.reminder_alerts ?? true,
  };
}

/** Whether a push of the given type should be sent for these preferences. */
export function shouldNotify(type: NotificationType, prefs: NotificationPrefs): boolean {
  if (!prefs.pushEnabled) return false;
  switch (type) {
    case 'deposit':
      return prefs.depositAlerts;
    case 'withdrawal':
      return prefs.withdrawalAlerts;
    case 'loan':
    case 'repayment':
      return prefs.loanAlerts;
    case 'reminder':
      return prefs.reminderAlerts;
  }
}
