import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { AIModel } from '../api/types';
import { apiQueryKey } from '../lib/queryKeys';

export function useModels() {
  return useQuery<AIModel[], Error>({
    queryKey: apiQueryKey('models'),
    queryFn: () => apiClient.getModels(),
    staleTime: 60000,
  });
}
