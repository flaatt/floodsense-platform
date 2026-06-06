import { useQuery } from '@tanstack/react-query';
import { statsAPI } from '../services/api';

export function useSummary() {
  return useQuery({
    queryKey: ['stats', 'summary'],
    queryFn: () => statsAPI.getSummary().then((r) => r.data.data),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: () => statsAPI.getDashboard().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}
