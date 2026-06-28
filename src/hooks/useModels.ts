import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { AIModel } from '../api/types';

export function useModels() {
  return useQuery<AIModel[], Error>({
    queryKey: ['models'],
    queryFn: () => apiClient.getModels(),
    staleTime: 60000,
  });
}
