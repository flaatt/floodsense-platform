export const RISK = {
  0: { label: 'Inconnu',   color: '#4a6278', bg: '#1a2535', border: '#2d3748', emoji: '⬛' },
  1: { label: 'Faible',    color: '#27ae60', bg: '#0d2e1a', border: '#1a5c3a', emoji: '🟢' },
  2: { label: 'Modéré',    color: '#f39c12', bg: '#2a1e00', border: '#7a5c00', emoji: '🟡' },
  3: { label: 'Élevé',     color: '#e67e22', bg: '#2a1000', border: '#7a3000', emoji: '🟠' },
  4: { label: 'Critique',  color: '#e74c3c', bg: '#2a0808', border: '#7a1010', emoji: '🔴' },
};

export const ALERT_TYPE = {
  watch:     { label: 'Surveillance', color: '#f39c12', icon: '👁' },
  warning:   { label: 'Avertissement', color: '#e67e22', icon: '⚠️' },
  emergency: { label: 'Urgence',       color: '#e74c3c', icon: '🚨' },
};

export function getRiskConfig(level) {
  return RISK[level] || RISK[0];
}

export function formatProbability(p) {
  return `${Math.round((p || 0) * 100)}%`;
}

export function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'à l\'instant';
  if (mins < 60)  return `il y a ${mins}min`;
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${days}j`;
}
