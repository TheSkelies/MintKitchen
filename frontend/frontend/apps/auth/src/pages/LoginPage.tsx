import React, { useState } from 'react';
import { authApi } from '@mintkitchen/api';
import { useAuth } from '../store';

interface Props {
  onGoRegister?: () => void;
  onSuccess?: () => void;
}

export default function LoginPage({ onGoRegister, onSuccess }: Props) {
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
      // TODO BACKEND: POST /api/auth/login → AuthResponse
      const data = await authApi.login({ email, password });
      setAuth(data.user, data.token);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{
        width: 640,
        background: 'var(--mk-mint)',
        padding: '100px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--mk-coffee)' }}>
          MintKitchen
        </div>
        <div style={{ fontSize: 20, color: 'var(--mk-coffee)', lineHeight: 1.5 }}>
          Следи за сроками,<br />готовь с удовольствием.
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 16, color: 'var(--mk-coffee)' }}>✦  Умный учёт продуктов</div>
        <div style={{ fontSize: 16, color: 'var(--mk-coffee)' }}>✦  Рецепты из того, что есть</div>
        <div style={{ fontSize: 16, color: 'var(--mk-coffee)' }}>✦  Видео-инструкции</div>
      </div>

      <div style={{
        flex: 1,
        padding: '160px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: 'var(--mk-coffee)' }}>
          С возвращением!
        </h1>
        <p style={{ fontSize: 15, color: 'var(--mk-muted)', marginBottom: 12 }}>
          Войди в свой аккаунт
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              placeholder="••••••••"
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

          {error && (
            <div style={{ color: 'red', fontSize: 14 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 56, marginTop: 8,
              borderRadius: 14, border: 'none',
              background: 'var(--mk-coffee)', color: 'white',
              fontSize: 16, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

        <p style={{ fontSize: 14, color: 'var(--mk-coffee)', marginTop: 4 }}>
          Нет аккаунта?{' '}
          <span
            onClick={onGoRegister}
            style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Зарегистрироваться
          </span>
        </p>
      </div>
    </div>
  );
}