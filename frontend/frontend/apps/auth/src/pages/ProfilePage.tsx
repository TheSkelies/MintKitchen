import React, { useState, useEffect } from 'react';
import { useAuth } from '../store';
import { authApi, favoritesApi, type Recipe } from '@mintkitchen/api';

interface Props {
  onLogout?: () => void;
  onOpenRecipe?: (id: string) => void;
}

const OPEN_RECIPE_KEY = 'mk_open_recipe_id';

export default function ProfilePage({ onLogout, onOpenRecipe }: Props) {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<'info' | 'favorites'>('info');
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);

  useEffect(() => {
    if (tab !== 'favorites') return;
    setLoadingFavs(true);
    favoritesApi.getAll()
      .then((data) => setFavorites(data))
      .catch((e) => {
        console.warn('Не удалось загрузить избранное', e);
        setFavorites([]);
      })
      .finally(() => setLoadingFavs(false));
  }, [tab]);

  const openRecipe = (id: string) => {
    localStorage.setItem(OPEN_RECIPE_KEY, String(id));
    if (onOpenRecipe) onOpenRecipe(id);
  };

  const removeFavorite = async (id: string) => {
    try {
      await favoritesApi.remove(id);
      setFavorites((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.warn('Не удалось убрать из избранного', e);
    }
  };

  const difficultyLabels: Record<string, string> = {
    easy: 'Легко', medium: 'Средне', hard: 'Сложно',
  };

  return (
    <div style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--mk-coffee)' }}>
          Профиль
        </h1>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            padding: '12px 22px', borderRadius: 14, border: 'none',
            background: 'var(--mk-coffee)', color: 'white',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          ✏️  Редактировать
        </button>
      </div>

      <div style={{
        background: 'white', borderRadius: 24, padding: 32,
        display: 'flex', alignItems: 'center', gap: 24,
        border: '1px solid var(--mk-border)',
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: 48,
          background: 'var(--mk-mint)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
        }}>
          👤
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--mk-coffee)' }}>
            {user?.name || 'Гость'}
          </div>
          <div style={{ fontSize: 15, color: 'var(--mk-muted)' }}>
            {user?.email || 'Войди, чтобы увидеть профиль'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setTab('info')}
          style={{
            padding: '12px 22px', borderRadius: 12,
            border: tab === 'info' ? '1px solid var(--mk-coffee)' : '1px solid var(--mk-border)',
            background: tab === 'info' ? 'var(--mk-mint)' : 'white',
            color: 'var(--mk-coffee)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          ℹ️ Информация
        </button>
        <button
          onClick={() => setTab('favorites')}
          style={{
            padding: '12px 22px', borderRadius: 12,
            border: tab === 'favorites' ? '1px solid var(--mk-coffee)' : '1px solid var(--mk-border)',
            background: tab === 'favorites' ? 'var(--mk-mint)' : 'white',
            color: 'var(--mk-coffee)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          ⭐ Избранное
        </button>
      </div>

      {tab === 'info' && (
        <div style={{
          background: 'white', borderRadius: 20, padding: 24,
          border: '1px solid var(--mk-border)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: 16, color: 'var(--mk-coffee)' }}>
            <strong>Имя:</strong> {user?.name || '—'}
          </div>
          <div style={{ fontSize: 16, color: 'var(--mk-coffee)' }}>
            <strong>Email:</strong> {user?.email || '—'}
          </div>
          <div style={{ fontSize: 16, color: 'var(--mk-coffee)' }}>
            <strong>Дата регистрации:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}
          </div>

          <button
            onClick={() => { logout(); if (onLogout) onLogout(); }}
            style={{
              padding: '14px 24px', borderRadius: 12, border: '1px solid var(--mk-border)',
              background: 'white', color: 'var(--mk-coffee)',
              fontSize: 15, cursor: 'pointer', alignSelf: 'flex-start', marginTop: 8,
            }}
          >
            🚪 Выйти из аккаунта
          </button>
        </div>
      )}

      {tab === 'favorites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loadingFavs && <div style={{ color: 'var(--mk-muted)', padding: 20 }}>Загрузка избранного...</div>}

          {!loadingFavs && favorites.length === 0 && (
            <div style={{
              background: 'white', borderRadius: 20, padding: 40,
              border: '1px solid var(--mk-border)',
              textAlign: 'center', color: 'var(--mk-muted)',
            }}>
              ⭐ Здесь пока пусто.<br />Открой любой рецепт и нажми «В избранное».
            </div>
          )}

          {!loadingFavs && favorites.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'white', borderRadius: 20, padding: '20px 24px',
                border: '1px solid var(--mk-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--mk-coffee)', marginBottom: 6 }}>
                  🍳 {r.title}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: 'var(--mk-mint-soft)', color: 'var(--mk-coffee)',
                  }}>🔥 {difficultyLabels[r.difficulty] || r.difficulty}</span>
                  <span style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: 'var(--mk-blue-soft)', color: 'var(--mk-coffee)',
                  }}>⏱ {r.cookTime} мин</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openRecipe(r.id)}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: 'var(--mk-mint)', color: 'var(--mk-coffee)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >Открыть</button>
                <button
                  onClick={() => removeFavorite(r.id)}
                  title="Убрать из избранного"
                  style={{
                    padding: '10px 14px', borderRadius: 10,
                    border: '1px solid var(--mk-border)', background: 'white',
                    color: 'var(--mk-coffee)', fontSize: 13, cursor: 'pointer',
                  }}
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const updated = await authApi.updateMe({ name, email, password });
      updateUser(updated); // Обновляем контекст — UI сразу перерисуется
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Не удалось сохранить профиль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(80,55,53,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460, background: 'white', borderRadius: 24,
          padding: 32, display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 24px 60px rgba(105,77,75,0.18)',
        }}
      >
        <div style={{
          background: 'var(--mk-coffee)', color: 'white',
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontWeight: 700,
        }}>
          <span>⚙️ Настройки профиля</span>
          <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--mk-mint)' }}>✕</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-coffee)' }}>Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Твоё имя"
              required
              style={{
                width: '100%', height: 48, marginTop: 6, padding: '0 16px',
                borderRadius: 12, border: '1px solid var(--mk-border)',
                background: 'var(--mk-bg-blue)', fontSize: 15, color: 'var(--mk-coffee)',
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
                width: '100%', height: 48, marginTop: 6, padding: '0 16px',
                borderRadius: 12, border: '1px solid var(--mk-border)',
                background: 'var(--mk-bg-blue)', fontSize: 15, color: 'var(--mk-coffee)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-coffee)' }}>Новый пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Оставь пустым, если не меняешь"
              style={{
                width: '100%', height: 48, marginTop: 6, padding: '0 16px',
                borderRadius: 12, border: '1px solid var(--mk-border)',
                background: 'var(--mk-bg-blue)', fontSize: 15, color: 'var(--mk-coffee)',
              }}
            />
          </div>

          {success && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--mk-mint-soft)', color: 'var(--mk-coffee)', fontSize: 14, fontWeight: 600 }}>
              ✓ Сохранено!
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FFE5E0', color: '#8B3A2E', fontSize: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px', borderRadius: 12, border: '1px solid var(--mk-border)',
                background: 'white', color: 'var(--mk-coffee)', fontSize: 15, cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none',
                background: 'var(--mk-mint)', color: 'var(--mk-coffee)',
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
