import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import toast from 'react-hot-toast';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAppStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await authAPI.login(form);
      login(r.data.user, r.data.token);
      toast.success(`Bienvenue, ${r.data.user.username}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    background: '#111820', border: '1px solid #2E3D50', borderRadius: 6,
    fontFamily: 'DM Mono', fontSize: 13, color: '#EEF2F7', outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 24,
      background: 'radial-gradient(ellipse at 50% 0%, rgba(0,100,130,0.15) 0%, transparent 60%)',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#111820', border: '1px solid #2E3D50',
        borderRadius: 12, padding: '36px 32px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        animation: 'fadeIn 0.4s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌊</div>
          <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: 32, fontWeight: 700, color: '#EEF2F7', letterSpacing: '0.05em' }}>
            FLOOD<span style={{ color: '#00C8FF' }}>SENSE</span>
          </h1>
          <p style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#5D6D7E', letterSpacing: '0.15em', marginTop: 4 }}>
            ACCÈS ADMINISTRATEUR
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: 10, color: '#8FA3BA', letterSpacing: '0.1em', marginBottom: 8 }}>
              EMAIL
            </label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="admin@floodsense.cd"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#00C8FF'}
              onBlur={e => e.target.style.borderColor = '#2E3D50'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'DM Mono', fontSize: 10, color: '#8FA3BA', letterSpacing: '0.1em', marginBottom: 8 }}>
              MOT DE PASSE
            </label>
            <input
              type="password" required value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#00C8FF'}
              onBlur={e => e.target.style.borderColor = '#2E3D50'}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: 8, padding: '13px 24px',
            fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700, letterSpacing: '0.08em',
            color: '#0A0E14', background: loading ? '#006B87' : '#00C8FF',
            border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 0 20px rgba(0,200,255,0.3)',
          }}>
            {loading ? 'CONNEXION...' : 'SE CONNECTER →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontFamily: 'DM Mono', fontSize: 10, color: '#2E3D50', marginTop: 24 }}>
          Accès réservé aux opérateurs FloodSense
        </p>
      </div>
    </div>
  );
}
