import React, { useState } from 'react';
import { authApi } from '@mintkitchen/api';
import { useAuth } from '../store';

interface Props {
  onGoLogin?: () => void;
  onSuccess?: () => void;
}

export default function RegisterPage({ onGoLogin, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // TODO BACKEND: POST /api/auth/register → AuthResponse
      const data = await authApi.register({ name, email, password });
      setAuth(data.user, data.token);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{
        flex: 1,
        padding: '120px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--mk-bg-blue)',
      }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: 'var(--mk-coffee)' }}>
          Создать аккаунт
        </h1>
        <p style={{ fontSize: 15, color: 'var(--mk-muted)', marginBottom: 12 }}>
          Пара шагов и ты в деле
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-coffee)' }}>Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как тебя зовут?"
              required
              style={{
                width: '100%', height: 52, marginTop: 6,
                padding: '0 16px', borderRadius: 12,
                border: '1px solid var(--mk-border)',
                background: 'white', fontSize: 15,
                color: 'var(--mk-coffee)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-coffee)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%', height: 52, marginTop: 6,
                padding: '0 16px', borderRadius: 12,
                border: '1px solid var(--mk-border)',
                background: 'white', fontSize: 15,
                color: 'var(--mk-coffee)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-coffee)' }}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              required
              minLength={8}
              style={{
                width: '100%', height: 52, marginTop: 6,
                padding: '0 16px', borderRadius: 12,
                border: '1px solid var(--mk-border)',
                background: 'white', fontSize: 15,
                color: 'var(--mk-coffee)',
              }}
            />
          </div>

          {error && <div style={{ color: 'red', fontSize: 14 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 56, marginTop: 8,
              borderRadius: 14, border: 'none',
              background: 'var(--mk-mint)', color: 'var(--mk-coffee)',
              fontSize: 16, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Создаём...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p style={{ fontSize: 14, color: 'var(--mk-coffee)', marginTop: 4 }}>
          Уже есть аккаунт?{' '}
          <span
            onClick={onGoLogin}
            style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Войти
          </span>
        </p>
      </div>

      <div style={{
        width: 640,
        background: 'var(--mk-coffee)',
        padding: '100px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: 'white' }}>
          MintKitchen
        </div>
        <div style={{ fontSize: 20, color: 'var(--mk-mint)' }}>
          Твой кухонный помощник
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 18, color: 'white', lineHeight: 1.5 }}>
          Присоединяйся к тысячам<br />пользователей уже сегодня.
        </div>
      </div>
    </div>
  );
}