import React, { useState } from 'react';
import { useZonesStore } from '../../store/zonesStore';
import { useCreateAlert } from '../../hooks/useAlerts';
import { Button, Input, Select } from '../UI';
import './alerts.css';

export default function CreateAlertModal({ onClose }) {
  const zones = useZonesStore(s => s.zones);
  const { mutate, isPending, isError, error } = useCreateAlert();

  const [form, setForm] = useState({
    zone_id:    '',
    alert_type: 'warning',
    message_fr: '',
    channels:   ['web', 'email'],
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleChannel = (ch) => set('channels',
    form.channels.includes(ch)
      ? form.channels.filter(c => c !== ch)
      : [...form.channels, ch]
  );

  const handleSubmit = () => {
    if (!form.zone_id || !form.message_fr.trim()) return;
    mutate({ ...form, zone_id: parseInt(form.zone_id) }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-fade-in-up">
        <div className="modal-header">
          <h2 className="modal-title font-display">Créer une alerte</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <Select label="Zone" value={form.zone_id} onChange={e => set('zone_id', e.target.value)}>
            <option value="">Sélectionner une zone...</option>
            {zones.sort((a,b) => a.commune.localeCompare(b.commune)).map(z => (
              <option key={z.id} value={z.id}>{z.commune}{z.quartier ? ` — ${z.quartier}` : ''}</option>
            ))}
          </Select>

          <Select label="Type d'alerte" value={form.alert_type} onChange={e => set('alert_type', e.target.value)}>
            <option value="watch">👁️ Surveillance</option>
            <option value="warning">⚠️ Avertissement</option>
            <option value="emergency">🚨 Urgence critique</option>
          </Select>

          <div className="input-group">
            <label className="input-label">Message (Français)</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Message d'alerte destiné aux parties prenantes..."
              value={form.message_fr}
              onChange={e => set('message_fr', e.target.value)}
              style={{ resize: 'vertical', minHeight: 80 }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{form.message_fr.length}/500</span>
          </div>

          <div className="input-group">
            <label className="input-label">Canaux d'envoi</label>
            <div className="channel-toggles">
              {['web','email','sms'].map(ch => (
                <button
                  key={ch}
                  className={`channel-toggle ${form.channels.includes(ch) ? 'active' : ''}`}
                  onClick={() => toggleChannel(ch)}
                  type="button"
                >
                  {ch === 'web' ? '🌐' : ch === 'email' ? '📧' : '📱'} {ch.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {isError && (
            <div className="modal-error">❌ {error?.error || 'Erreur lors de l\'envoi'}</div>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button variant={form.alert_type === 'emergency' ? 'danger' : 'primary'}
                  loading={isPending} onClick={handleSubmit}
                  disabled={!form.zone_id || !form.message_fr.trim()}>
            Envoyer l'alerte
          </Button>
        </div>
      </div>
    </div>
  );
}
