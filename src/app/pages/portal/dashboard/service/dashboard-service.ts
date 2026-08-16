import { Service } from '@angular/core';
import { AUTH_SESSION_KEY } from '@constants/auth.const';
import { DashboardData } from '@interfaces/dashboard.interface';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';

@Service()
export class DashboardService extends IpcBridgeService {
  /**
   * Builds a per-session key from the current auth session token.
   * Returns null when no session is active.
   */
  private getWelcomeKey(): string | null {
    const token = localStorage.getItem(AUTH_SESSION_KEY);
    return token ? `credence.dashboard.welcome.${token}` : null;
  }

  /**
   * Whether the welcome message should be shown for the current session.
   */
  get showWelcomeMessage(): boolean {
    const key = this.getWelcomeKey();
    return key ? sessionStorage.getItem(key) !== 'true' : false;
  }

  /**
   * Marks the welcome message as shown for the current session.
   */
  setWelcomeMessageShown(): void {
    const key = this.getWelcomeKey();
    if (key) {
      sessionStorage.setItem(key, 'true');
    }
  }

  /**
   * Fetches the complete dashboard dataset from the Electron main process.
   */
  async getDashboardData(): Promise<DashboardData> {
    return this.executeIPC(api => api.getDashboardData());
  }
}
