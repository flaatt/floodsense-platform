import React, { useState, useEffect } from 'react';
import { zonesAPI, alertsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './AlertForm.css';

export default function AlertForm({ onCreated }) {
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    zone_id: '', alert_type: 'warning', message_fr: '',
    channels: ['web', 'email'],
  });

  useEffect(() => {
    zonesAPI.getAll().then(r => setZones(r.data.data)).catch(() => {});
  }, []);

  const handleChannel = (ch) => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.zone_id || !form.message_fr) { toast.error('Remplissez tous les champs obligatoires.'); return; }
    setLoading(true);
    try {
      await alertsAPI.create({ ...form, zone_id: parseInt(form.zone_id) });
      toast.success('Alerte créée et envoyée !');
      setForm({ zone_id: '', alert_type: 'warning', message_fr: '', channels: ['web', 'email'] });
      onCreated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="alert-form">
      <h3 className="af-title">Créer une alerte manuelle</h3>
      <form onSubmit={handleSubmit} className="af-form">
        <div className="af-row">
          <label className="af-label">Zone *</label>
          <select className="af-select" value={form.zone_id} onChange={e => setForm(f => ({...f, zone_id: e.target.value}))}>
            <option value="">— Sélectionner une zone —</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.commune} (Risque {z.risk_level})</option>)}
          </select>
        </div>

        <div className="af-row">
          <label className="af-label">Type *</label>
          <div className="af-type-group">
            {['watch','warning','emergency'].map(t => (
              <button key={t} type="button"
                className={`af-type-btn ${form.alert_type === t ? 'active' : ''}`}
                data-type={t}
                onClick={() => setForm(f => ({...f, alert_type: t}))}>
                {t === 'watch' ? '👁 Surveillance' : t === 'warning' ? '⚠️ Avertissement' : '🚨 Urgence'}
              </button>
            ))}
          </div>
        </div>

        <div className="af-row">
          <label className="af-label">Message *</label>
          <textarea
            className="af-textarea"
            placeholder="Message d'alerte en français..."
            value={form.message_fr}
            onChange={e => setForm(f => ({...f, message_fr: e.target.value}))}
            rows={3}
            maxLength={500}
          />
          <span className="af-char-count">{form.message_fr.length}/500</span>
        </div>

        <div className="af-row">
          <label className="af-label">Canaux</label>
          <div className="af-channels">
            {['web','email','sms'].map(ch => (
              <label key={ch} className={`af-channel ${form.channels.includes(ch) ? 'active' : ''}`}>
                <input type="checkbox" checked={form.channels.includes(ch)} onChange={() => handleChannel(ch)} />
                {ch === 'web' ? '🌐 Web' : ch === 'email' ? '📧 Email' : '📱 SMS'}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="af-submit" disabled={loading}>
          {loading ? 'Envoi...' : '📤 Envoyer l\'alerte'}
        </button>
      </form>
    </div>
  );
}
