import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export function useAdminStatus() {
  return useQuery({
    queryKey: ['adminStatus'],
    queryFn: () => apiClient.getAdminStatus(),
    refetchInterval: (query) => {
      // Fast polling if job is running
      const job = query.state.data?.activeJob;
      return job && job.status === 'running' ? 1000 : 5000;
    },
  });
}

export function usePipelineActions() {
  const queryClient = useQueryClient();

  const loadMutation = useMutation({
    mutationFn: () => apiClient.loadDataset(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminStatus'] }),
  });

  const preprocessMutation = useMutation({
    mutationFn: () => apiClient.preprocessDataset(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminStatus'] }),
  });

  const trainMutation = useMutation({
    mutationFn: (modelType: 'baseline' | 'lstm') => apiClient.trainModel(modelType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminStatus'] }),
  });

  return { loadMutation, preprocessMutation, trainMutation };
}
