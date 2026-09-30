import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock server-only so server services can run within test runners
vi.mock('server-only', () => ({}));

// Mock Next.js navigation hooks for component rendering tests
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/payroll',
  useSearchParams: () => new URLSearchParams(),
}));

// Automatically clean up React DOM after each test
afterEach(() => {
  cleanup();
});
