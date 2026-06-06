// ─────────────────────────────────────────────────────────────
//  src/pages/LoginPage.js
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/UI';
import './pages.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const login    = useAuthStore(s => s.login);

  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.email || !form.password) return;
    setLoading(true); setError('');
    try {
      const res = await authApi.login(form);
      login({ token: res.token, user: res.user });
      navigate('/admin');
    } catch (err) {
      setError(err?.error || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-login">
      {/* Background grid */}
      <div className="login-bg-grid" aria-hidden="true" />

      <div className="login-card animate-fade-in-up">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon font-display">◉</div>
          <div className="login-logo-text">
            <span className="font-display" style={{ fontSize: 22, fontWeight: 800 }}>FloodSense</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Kinshasa — Admin</span>
          </div>
        </div>

        <h1 className="login-title font-display">Connexion</h1>
        <p className="login-subtitle">Accès réservé aux administrateurs autorisés</p>

        <form onSubmit={handleSubmit} className="login-form">
          <Input
            label="Adresse email"
            type="email"
            placeholder="admin@floodsense.cd"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            icon="✉"
            autoComplete="email"
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            icon="🔒"
            autoComplete="current-password"
          />

          {error && (
            <div className="login-error">❌ {error}</div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading}
                  disabled={!form.email || !form.password}
                  className="login-submit-btn">
            Se connecter
          </Button>
        </form>

        <div className="login-footer">
          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            Problème d'accès ? Contacter l'administrateur système.
          </span>
        </div>
      </div>

      {/* Credits */}
      <div className="login-credits">
        FloodSense Kinshasa v1.0 — Makeathon GeoData 2026 — Données Open Source
      </div>
    </div>
  );
}
