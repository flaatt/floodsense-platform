import { useQuery } from '@tanstack/react-query';
import { zonesAPI } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export function useZones(params) {
  const riskUpdates = useAppStore((s) => s.riskUpdates);

  const query = useQuery({
    queryKey: ['zones', params],
    queryFn: () => zonesAPI.getAll(params).then((r) => r.data.data),
    refetchInterval: 5 * 60 * 1000, // refetch toutes les 5 min
    staleTime: 2 * 60 * 1000,
  });

  // Fusionner les updates WebSocket avec les données DB
  const data = query.data?.map((z) => {
    const live = riskUpdates[z.id];
    if (!live) return z;
    return { ...z, risk_level: live.risk_level, risk_score: live.risk_score };
  });

  return { ...query, data };
}

export function useZone(id) {
  return useQuery({
    queryKey: ['zone', id],
    queryFn: () => zonesAPI.getById(id).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}
