import { UserRole, UserSession } from '../types';

export class AuthService {
  private static STORAGE_KEY = 'air_intel_user_session';

  static getCurrentUser(): UserSession | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      // Default to mandatory Personal Demo user if not signed in
      return { email: 'parasnath@gmail.com', role: 'personal' };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static setCurrentUser(session: UserSession): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  }

  static clearCurrentUser(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static isAuthorized(user: UserSession | null, allowedRoles: UserRole[]): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return allowedRoles.includes(user.role);
  }
}
