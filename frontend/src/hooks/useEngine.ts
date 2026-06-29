import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { EngineDetail, PredictRequest } from '../api/types';
import { apiQueryKey } from '../lib/queryKeys';

export function useEngine(engineId: string) {
  return useQuery<EngineDetail, Error>({
    queryKey: apiQueryKey('engine', engineId),
    queryFn: () => apiClient.getEngine(engineId),
    enabled: Boolean(engineId),
    refetchInterval: 15000,
  });
}

export function useEngineSensors(engineId: string, fromCycle?: number, toCycle?: number) {
  return useQuery({
    queryKey: apiQueryKey('engine', engineId, 'sensors', fromCycle, toCycle),
    queryFn: () => apiClient.getEngineSensors(engineId, { from_cycle: fromCycle, to_cycle: toCycle }),
    enabled: Boolean(engineId),
  });
}

export function usePredictRul() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: PredictRequest) => apiClient.predictRul(req),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: apiQueryKey('engine', variables.engineId) });
      queryClient.invalidateQueries({ queryKey: apiQueryKey('fleet') });
    },
  });
}
