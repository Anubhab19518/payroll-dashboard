'use server';

import { loginSchema } from '../schemas/login.schema';
import { AuthService } from '../services/auth-service';
import type { AuthActionResult } from '../types/auth.types';
import { logger } from '@/lib/logger/logger';

export async function loginAction(formData: unknown): Promise<AuthActionResult> {
  const result = loginSchema.safeParse(formData);

  if (!result.success) {
    logger.warn('Login validation failed', { fieldErrors: result.error.flatten().fieldErrors });
    return {
      success: false,
      error: 'Invalid form submission',
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const authResult = await AuthService.login(result.data);

    return {
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email || '',
        name: authResult.user.name || '',
        role: authResult.user.isSuperAdmin ? 'admin' : 'manager',
      },
    };
  } catch (error) {
    logger.error('Unexpected error during login action', error);
    const msg = error instanceof Error ? error.message : 'Invalid credentials. Please try again.';
    return {
      success: false,
      error: msg,
    };
  }
}
