import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { FleetResponse } from '../api/types';
import { apiQueryKey } from '../lib/queryKeys';

export function useFleet() {
  return useQuery<FleetResponse, Error>({
    queryKey: apiQueryKey('fleet'),
    queryFn: () => apiClient.getFleet(),
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
