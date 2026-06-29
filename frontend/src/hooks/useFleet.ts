import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { FleetResponse } from '../api/types';

export function useFleet() {
  return useQuery<FleetResponse, Error>({
    queryKey: ['fleet'],
    queryFn: () => apiClient.getFleet(),
    refetchInterval: 10000, // Background refresh every 10s
    staleTime: 5000,
  });
}
