import { Service } from '@angular/core';
import { AUTH_FULLNAME_KEY, AUTH_SESSION_KEY, AUTH_USER_KEY, AUTH_USERNAME_KEY } from '@constants/auth.const';
import { User, AuthUser } from '@interfaces/user.interface';
import { IpcBridgeService } from '@core/services/ipc-bridge-service';
import { ToastService } from '@core/components/toast/service/toast-service';

interface LoginPayload {
  username: string;
  password: string;
}

interface RegisterPayload {
  fullname: string;
  username: string;
  password: string;
}

@Service()
export class AuthService extends IpcBridgeService {
  /**
   * Fetches all users from the database.
   */
  async getUsers(): Promise<User[]> {
    return this.executeIPC(api => api.getUsers());
  }

  /**
   * Toggles the disabled status of a user.
   */
  async toggleUserStatus(userId: string): Promise<User> {
    return this.executeIPC(api => api.toggleUserStatus({ userId }));
  }

  /**
   * Registers a new user account through the Electron bridge.
   * Returns the created user object when persistence succeeds.
   */
  async register(payload: RegisterPayload): Promise<AuthUser> {
    return this.executeIPC(api => api.addUser(payload));
  }

  /**
   * Updates an existing user's profile details.
   */
  async updateUser(payload: { id: string; currentPassword?: string; fullname?: string; username?: string; password?: string }): Promise<AuthUser> {
    return this.executeIPC(api => api.updateUser(payload));
  }

  /**
   * Authenticates a user and stores a local auth session for route guards.
   * Throws when credentials are invalid or Electron API is unavailable.
   */
  async login(payload: LoginPayload): Promise<AuthUser> {
    const user = await this.executeIPC(api => api.loginUser(payload));
    this.setSession(user.id, user.username, user.fullname);
    return user;
  }

  /**
   * Verifies the provided password matches the active user's stored password
   * without creating a new session or modifying state.
   */
  async verifyPassword(password: string): Promise<void> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('NOT_AUTHENTICATED');
    }
    await this.executeIPC(api => api.verifyPassword({ userId, password }));
  }

  /**
   * Ends the active session locally and notifies the backend when possible.
   * This method always clears local state, even if IPC logout fails.
   */
  async logout(): Promise<void> {
    const userId = this.getUserId();
    this.clearSession();

    if (!userId) {
      return;
    }

    try {
      await this.executeIPC(api => api.logoutUser({ userId }));
    } catch {
      // Intentionally swallow logout IPC failures to preserve local sign-out behavior.
    }
  }

  /**
   * Resolves the active authenticated user by verifying the stored session id against the backend.
   * Clears the local session and throws when the user no longer exists or the session is stale.
   */
  async getActiveUser(): Promise<AuthUser> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('NOT_AUTHENTICATED');
    }

    const user = await this.executeIPC(api => api.getUserById({ id: userId }));
    if (!user) {
      this.clearSession();
      throw new Error('SESSION_EXPIRED');
    }

    // Update stored fullname in case it was missing or changed
    localStorage.setItem(AUTH_FULLNAME_KEY, user.fullname);

    return user as AuthUser;
  }

  /**
   * Normalizes auth/session errors thrown while validating the active user and surfaces user-friendly toast feedback.
   */
  async handleAuthError(
    error: unknown,
    toastService: ToastService,
    messages?: { expired?: string; generic?: string }
  ): Promise<void> {
    console.error('Unable to verify active session', error);
    const message = error instanceof Error ? error.message : '';
    const sessionError = message === 'NOT_AUTHENTICATED' || message === 'SESSION_EXPIRED';

    if (sessionError) {
      await this.logout();
      toastService.error({ message: messages?.expired ?? 'Session expired. Please log in again.' });
      return;
    }

    toastService.error({ message: messages?.generic ?? 'Unable to verify your session. Please try again.' });
  }

  /**
   * Determines whether a valid local auth session exists.
   */
  isAuthenticated(): boolean {
    return Boolean(this.getUserId() && this.getSessionToken());
  }

  /**
   * Returns the active authenticated user id from local storage.
   */
  getUserId(): string | null {
    return localStorage.getItem(AUTH_USER_KEY);
  }

  /**
   * Returns the active local session token from local storage.
   */
  getSessionToken(): string | null {
    return localStorage.getItem(AUTH_SESSION_KEY);
  }

  /**
   * Returns the active authenticated username from local storage.
   */
  getUsername(): string | null {
    return localStorage.getItem(AUTH_USERNAME_KEY);
  }

  /**
   * Returns the active authenticated full name from local storage.
   */
  getFullname(): string | null {
    return localStorage.getItem(AUTH_FULLNAME_KEY);
  }

  /**
   * Persists auth keys consumed by route guards and session checks.
   */
  private setSession(userId: string, username: string, fullname: string): void {
    const sessionToken = `session-${userId}-${Date.now()}`;
    localStorage.setItem(AUTH_USER_KEY, userId);
    localStorage.setItem(AUTH_USERNAME_KEY, username);
    localStorage.setItem(AUTH_FULLNAME_KEY, fullname);
    localStorage.setItem(AUTH_SESSION_KEY, sessionToken);
  }

  /**
   * Removes all persisted auth keys from local storage.
   */
  private clearSession(): void {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
    localStorage.removeItem(AUTH_FULLNAME_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
}
