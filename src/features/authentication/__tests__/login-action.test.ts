import { describe, it, expect, vi } from 'vitest';
import { loginAction } from '../actions/login.action';
import { AuthService } from '../services/auth-service';

describe('Login Server Action (AGENTS.md Rule 15)', () => {
  it('should authenticate valid credentials successfully', async () => {
    vi.spyOn(AuthService, 'login').mockResolvedValueOnce({
      accessToken: 'mock-token',
      user: {
        id: 'usr_admin_01',
        email: 'admin@example.com',
        name: 'Administrator',
        isSuperAdmin: true,
      },
    });

    const result = await loginAction({
      identifier: 'admin@example.com',
      password: 'Password123!',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe('admin@example.com');
      expect(result.user.role).toBe('admin');
    }
  });

  it('should return error for invalid credentials', async () => {
    vi.spyOn(AuthService, 'login').mockRejectedValueOnce(new Error('Invalid email or password'));

    const result = await loginAction({
      identifier: 'admin@example.com',
      password: 'WrongPassword!',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid email or password');
    }
  });

  it('should return validation errors for empty input', async () => {
    const result = await loginAction({
      identifier: '',
      password: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.['identifier']).toBeDefined();
      expect(result.fieldErrors?.['password']).toBeDefined();
    }
  });
});
