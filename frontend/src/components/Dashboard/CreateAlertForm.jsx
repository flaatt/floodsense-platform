import React, { useState } from 'react';
import { useZones } from '../../hooks/useZones';
import { useCreateAlert } from '../../hooks/useAlerts';

export function CreateAlertForm() {
  const { data: zones } = useZones();
  const { mutate: createAlert, isPending } = useCreateAlert();
  const [form, setForm] = useState({
    zone_id: '', alert_type: 'warning',
    message_fr: '', channels: ['web', 'email'],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleChannel = (ch) => setForm(f => ({
    ...f,
    channels: f.channels.includes(ch)
      ? f.channels.filter(c => c !== ch)
      : [...f.channels, ch],
  }));

  const handleSubmit = () => {
    if (!form.zone_id || !form.message_fr) return;
    createAlert({ ...form, zone_id: parseInt(form.zone_id) });
  };

  const inputStyle = {
    width: '100%', background: '#0A0E14', border: '1px solid #2E3D50',
    borderRadius: 4, padding: '8px 12px', fontFamily: 'DM Mono', fontSize: 12,
    color: '#C4D1DE', outline: 'none',
  };
  const labelStyle = { fontFamily: 'DM Mono', fontSize: 10, color: '#8FA3BA', letterSpacing: '0.1em', display: 'block', marginBottom: 6 };

  return (
    <div style={{ background: '#111820', border: '1px solid #2E3D50', borderRadius: 8, padding: 20 }}>
      <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#8FA3BA', letterSpacing: '0.1em', marginBottom: 16 }}>
        CRÉER UNE ALERTE MANUELLE
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>ZONE CONCERNÉE</label>
          <select value={form.zone_id} onChange={e => set('zone_id', e.target.value)} style={inputStyle}>
            <option value="">Sélectionner une commune...</option>
            {(zones || []).map(z => (
              <option key={z.id} value={z.id}>{z.commune} (Risque {z.risk_level})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>TYPE D'ALERTE</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { v: 'watch',     label: '⚠️ Surveillance', color: '#F5C542' },
              { v: 'warning',   label: '🟠 Avertissement', color: '#F07B1D' },
              { v: 'emergency', label: '🔴 Urgence', color: '#E8314A' },
            ].map(opt => (
              <button key={opt.v} onClick={() => set('alert_type', opt.v)} style={{
                flex: 1, padding: '8px 4px',
                fontFamily: 'DM Mono', fontSize: 10, letterSpacing: '0.06em',
                color: form.alert_type === opt.v ? opt.color : '#8FA3BA',
                background: form.alert_type === opt.v ? `${opt.color}15` : '#0A0E14',
                border: `1px solid ${form.alert_type === opt.v ? opt.color : '#2E3D50'}`,
                borderRadius: 4, cursor: 'pointer',
              }}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>MESSAGE (FRANÇAIS)</label>
          <textarea
            value={form.message_fr}
            onChange={e => set('message_fr', e.target.value)}
            placeholder="Description de l'alerte et consignes..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        <div>
          <label style={labelStyle}>CANAUX D'ENVOI</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['web', 'email', 'sms', 'whatsapp'].map(ch => (
              <button key={ch} onClick={() => toggleChannel(ch)} style={{
                padding: '6px 12px', fontFamily: 'DM Mono', fontSize: 10,
                color: form.channels.includes(ch) ? '#00C8FF' : '#8FA3BA',
                background: form.channels.includes(ch) ? 'rgba(0,200,255,0.1)' : '#0A0E14',
                border: `1px solid ${form.channels.includes(ch) ? 'rgba(0,200,255,0.3)' : '#2E3D50'}`,
                borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase',
              }}>{ch}</button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending || !form.zone_id || !form.message_fr}
          style={{
            padding: '10px 20px', fontFamily: 'Barlow Condensed', fontSize: 15,
            fontWeight: 600, letterSpacing: '0.08em',
            color: '#0A0E14', background: isPending ? '#006B87' : '#00C8FF',
            border: 'none', borderRadius: 4, cursor: isPending ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', opacity: !form.zone_id || !form.message_fr ? 0.5 : 1,
          }}
        >
          {isPending ? 'ENVOI EN COURS...' : '📡 ENVOYER L\'ALERTE'}
        </button>
      </div>
    </div>
  );
}
