import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function timeAgo(date) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function formatDate(date, fmt = 'dd/MM/yyyy HH:mm') {
  if (!date) return '—';
  return format(new Date(date), fmt, { locale: fr });
}

export function formatNumber(n, suffix = '') {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${suffix}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K${suffix}`;
  return `${n}${suffix}`;
}

export function formatPercent(n) {
  if (n === null || n === undefined) return '—';
  return `${Math.round(n * 100)}%`;
}

export function formatRainfall(mm) {
  if (mm === null || mm === undefined) return '—';
  return `${mm.toFixed(1)} mm`;
}

export const RISK_LABELS = {
  0: 'Inconnu',
  1: 'Faible',
  2: 'Modéré',
  3: 'Élevé',
  4: 'Critique',
};

export const ALERT_TYPE_LABELS = {
  watch:     'Surveillance',
  warning:   'Avertissement',
  emergency: 'Urgence',
};

export const SEVERITY_LABELS = {
  minor:        'Mineure',
  moderate:     'Modérée',
  severe:       'Sévère',
  catastrophic: 'Catastrophique',
};
