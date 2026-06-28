import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { EngineDetail, PredictRequest } from '../api/types';

export function useEngine(engineId: string) {
  return useQuery<EngineDetail, Error>({
    queryKey: ['engine', engineId],
    queryFn: () => apiClient.getEngine(engineId),
    enabled: Boolean(engineId),
    refetchInterval: 15000,
  });
}

export function useEngineSensors(engineId: string) {
  return useQuery({
    queryKey: ['engine', engineId, 'sensors'],
    queryFn: () => apiClient.getEngineSensors(engineId),
    enabled: Boolean(engineId),
  });
}

export function usePredictRul() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: PredictRequest) => apiClient.predictRul(req),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['engine', variables.engineId] });
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
}
