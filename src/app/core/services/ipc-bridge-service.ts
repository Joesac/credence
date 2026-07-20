import { Service } from '@angular/core';
import { ElectronAPI } from '../../../decl';

type StructuredIpcError = Error & { code?: string; details?: unknown };

type IpcSuccessResponse<T> = { status: 'ok'; data: T };
type IpcErrorResponse = { status: 'error'; error: { code: string; message: string; details?: unknown } };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * Normalizes unknown values coming from Electron into typed errors the Angular
 * layer can branch on without parsing generic strings emitted by ipcRenderer.
 */
function normalizeIpcError(error: unknown): StructuredIpcError {
    const fallbackMessage = 'An unexpected error occurred while communicating with Electron.';

    if (isRecord(error)) {
        const raw = error;
        const causeCandidate = 'cause' in raw ? raw['cause'] : undefined;
        const candidate = isRecord(causeCandidate) ? causeCandidate : raw;

        const structured = new Error(
            'message' in candidate && typeof candidate['message'] === 'string'
                ? candidate['message']
                : fallbackMessage
        ) as StructuredIpcError;

        if ('code' in candidate && typeof candidate['code'] === 'string' && candidate['code'].trim()) {
            structured.code = candidate['code'];
        }

        if ('details' in candidate) {
            structured.details = candidate['details'];
        }

        return structured;
    }

    return new Error(fallbackMessage) as StructuredIpcError;
}

@Service()
export class IpcBridgeService {
    /**
     * Executes any IPC callback securely.
     * The generic type <R> is cleanly inferred directly from what the callback returns.
     */
    async executeIPC<R>(
        invoke: (api: ElectronAPI) => Promise<R> | R
    ): Promise<R> {
        if (!window.electronAPI) {
            const error = new Error('Electron environment not detected! Database features are unavailable in the browser.');
            console.error(error);
            throw error;
        }

        try {
            const response = await invoke(window.electronAPI);
            if (isIpcErrorResponse(response)) {
                throw normalizeSerializedError(response.error);
            }
            return (response as IpcSuccessResponse<R>).data;
        } catch (err) {
            // console.error(err);
            throw normalizeIpcError(err);
        }
    }

    extractIpcError(error: unknown) {
        return {
            message: error instanceof Error ? error.message : error,
            code: typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined,
            details: typeof error === 'object' && error !== null ? (error as { details?: unknown }).details : undefined,
        }
    }
}

function isIpcErrorResponse(value: unknown): value is IpcErrorResponse {
    return (
        isRecord(value) &&
        'status' in value &&
        value['status'] === 'error' &&
        'error' in value &&
        isRecord(value['error']) &&
        typeof value['error']['code'] === 'string'
    );
}

function normalizeSerializedError(error: { code: string; message: string; details?: unknown }): StructuredIpcError {
    const structured = new Error(error.message) as StructuredIpcError;
    structured.code = error.code;
    if (error.details !== undefined) {
        structured.details = error.details;
    }
    return structured;
}

