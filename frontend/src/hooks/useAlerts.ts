import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { AlertItem } from '../api/types';
import { apiQueryKey } from '../lib/queryKeys';
import toast from 'react-hot-toast';

export function useAlerts() {
  return useQuery<AlertItem[], Error>({
    queryKey: apiQueryKey('alerts'),
    queryFn: () => apiClient.getAlerts(),
    refetchInterval: 10000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, userName }: { alertId: string; userName?: string }) =>
      apiClient.acknowledgeAlert(alertId, userName),
    onMutate: async ({ alertId, userName }) => {
      await queryClient.cancelQueries({ queryKey: apiQueryKey('alerts') });
      const previousAlerts = queryClient.getQueryData<AlertItem[]>(apiQueryKey('alerts'));

      queryClient.setQueryData<AlertItem[]>(apiQueryKey('alerts'), (old) => {
        if (!old) return old;
        return old.map((alert) =>
          alert.alertId === alertId
            ? { ...alert, status: 'acknowledged', acknowledgedBy: userName || 'User' }
            : alert
        );
      });

      return { previousAlerts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(apiQueryKey('alerts'), context.previousAlerts);
      }
      toast.error('Failed to acknowledge alert');
    },
    onSuccess: () => {
      toast.success('Alert acknowledged');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKey('alerts') });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => apiClient.resolveAlert(alertId),
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: apiQueryKey('alerts') });
      const previousAlerts = queryClient.getQueryData<AlertItem[]>(apiQueryKey('alerts'));

      queryClient.setQueryData<AlertItem[]>(apiQueryKey('alerts'), (old) => {
        if (!old) return old;
        return old.map((alert) =>
          alert.alertId === alertId ? { ...alert, status: 'resolved' } : alert
        );
      });

      return { previousAlerts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(apiQueryKey('alerts'), context.previousAlerts);
      }
      toast.error('Failed to resolve alert');
    },
    onSuccess: () => {
      toast.success('Alert resolved');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKey('alerts') });
      queryClient.invalidateQueries({ queryKey: apiQueryKey('fleet') });
    },
  });
}
