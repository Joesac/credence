import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { serializeError, type SerializedIpcError } from './errors';

/**
 * Strongly typed signature for IPC handlers. The payload type mirrors what the
 * renderer sends while the return type mirrors what the renderer receives.
 */
type IpcHandler<TPayload, TResult> = (
  payload: TPayload,
  event: IpcMainInvokeEvent
) => Promise<TResult> | TResult;

type IpcSuccessResponse<TResult> = {
  status: 'ok';
  data: TResult;
};

type IpcErrorResponse = {
  status: 'error';
  error: SerializedIpcError;
};

/**
 * Registers an IPC handler with unified error handling so every renderer call
 * receives the same structured error payload. This prevents Electron from
 * wrapping errors in generic "Error invoking remote method" messages.
 */
export function registerIpcHandler<TPayload = unknown, TResult = unknown>(
  channel: string,
  handler: IpcHandler<TPayload, TResult>
): void {
  ipcMain.handle(channel, async (event, payload) => {
    try {
      const data = await handler(payload as TPayload, event);
      const response: IpcSuccessResponse<TResult> = {
        status: 'ok',
        data,
      };
      return response;
    } catch (error) {
      const serialized = serializeError(error);
      console.error(`[IPC:${channel}] ${serialized.message}`, serialized.details ?? '');
      const response: IpcErrorResponse = {
        status: 'error',
        error: serialized,
      };
      return response;
    }
  });
}
