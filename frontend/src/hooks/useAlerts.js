import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsAPI } from '../services/api';
import toast from 'react-hot-toast';

export function useActiveAlerts() {
  return useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => alertsAPI.getActive().then((r) => r.data.data),
    refetchInterval: 60 * 1000,
  });
}

export function useAlerts(params) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertsAPI.getAll(params).then((r) => r.data),
    staleTime: 30 * 1000,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: alertsAPI.create,
    onSuccess: () => {
      toast.success('Alerte envoyée avec succès');
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi');
    },
  });
}
