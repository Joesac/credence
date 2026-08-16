import { Service, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CloudSyncConfigService } from '../config';

export interface CloudError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Base HTTP client for cloud API calls.
 * Injects the Bearer API key header on every request and normalizes
 * HTTP errors into the same { code, message, details? } shape as IpcError
 * so the UI can handle IPC and HTTP errors identically.
 */
@Service()
export class CloudHttpService {
  protected readonly http = inject(HttpClient);
  private readonly configService = inject(CloudSyncConfigService);

  protected async post<T>(path: string, body: unknown): Promise<T> {
    const { apiUrl, apiKey } = await this.configService.getConfig();

    if (!apiUrl || !apiKey) {
      const error: CloudError = {
        code: 'CLOUD_NOT_CONFIGURED',
        message: 'Cloud sync is not configured. Set the API URL and key in Settings.',
      };
      throw error;
    }

    const url = `${apiUrl.replace(/\/+$/, '')}${path}`;

    try {
      return await firstValueFrom(
        this.http.post<T>(url, body, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
      );
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  protected async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const { apiUrl, apiKey } = await this.configService.getConfig();

    if (!apiUrl || !apiKey) {
      const error: CloudError = {
        code: 'CLOUD_NOT_CONFIGURED',
        message: 'Cloud sync is not configured. Set the API URL and key in Settings.',
      };
      throw error;
    }

    const url = `${apiUrl.replace(/\/+$/, '')}${path}`;
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        httpParams = httpParams.set(key, value);
      }
    }

    try {
      return await firstValueFrom(
        this.http.get<T>(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          params: httpParams,
        })
      );
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  private normalizeError(err: unknown): CloudError {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { code?: string; message?: string; details?: unknown } | null;
      return {
        code: body?.code ?? `HTTP_${err.status}`,
        message: body?.message ?? err.message ?? 'An unexpected HTTP error occurred.',
        details: body?.details,
      };
    }

    if (err instanceof Error) {
      return { code: 'NETWORK_ERROR', message: err.message };
    }

    return { code: 'UNKNOWN', message: 'An unexpected error occurred.' };
  }
}
