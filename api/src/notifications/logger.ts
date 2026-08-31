/**
 * Minimal structured logger for the notification subsystem.
 *
 * Emits one JSON object per line so events can be traced end-to-end
 * (transactionId → notificationEventId → attempt → OneSignal result).
 * Never logs credentials, tokens, or payload contents.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogFields {
  [key: string]: string | number | boolean | null | undefined;
}

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    scope: 'notifications',
    level,
    event,
    ...fields,
  });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const notifLogger = {
  info: (event: string, fields?: LogFields) => emit('info', event, fields),
  warn: (event: string, fields?: LogFields) => emit('warn', event, fields),
  error: (event: string, fields?: LogFields) => emit('error', event, fields),
};
