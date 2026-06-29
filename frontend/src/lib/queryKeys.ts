import { getDemoMode } from '../api/client';

export function apiQueryKey(base: string, ...parts: unknown[]) {
  return [base, getDemoMode() ? 'demo' : 'api', ...parts] as const;
}
