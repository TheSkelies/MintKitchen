import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import LazyVueApp from './LazyVueApp';

const AuthApp = lazy(() => import('auth/AuthApp'));
const HomeApp = lazy(() => import('home/HomeApp'));

const loadRecipes = () => import('recipes/mount');
const loadVideo = () => import('video/mount');
const loadAdmin = () => import('admin/mount');

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: '🏠', label: 'Продукты' },
    { path: '/recipes', icon: '📝', label: 'Рецепты' },
    { path: '/video', icon: '🎬', label: 'Видео' },
    { path: '/profile', icon: '👤', label: 'Профиль' },
    { path: '/admin', icon: '⚙️', label: 'Админ' },
  ];

  return (
    <aside style={{
      width: 260, minHeight: '100vh', background: 'var(--mk-mint)',
      padding: '32px 20px', display: 'flex', flexDirection: 'column',
      gap: 8, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 22 }}>🌿</span>
        <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--mk-coffee)' }}>MintKitchen</span>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mk-coffee-light)', letterSpacing: 1, marginBottom: 6 }}>
        МЕНЮ
      </div>

      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path} to={item.path}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 14, textDecoration: 'none',
              background: isActive ? 'var(--mk-coffee)' : 'transparent',
              color: isActive ? 'var(--mk-white)' : 'var(--mk-coffee)',
              fontWeight: isActive ? 600 : 400, fontSize: 15, transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <div style={{ flex: 1 }} />

      <button
        onClick={() => { localStorage.removeItem('mk_token'); navigate('/login'); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          borderRadius: 14, border: 'none', background: 'transparent',
          color: 'var(--mk-coffee)', fontSize: 15, cursor: 'pointer', textAlign: 'left',
        }}
      >
        🚪 Выйти
      </button>

      <div style={{ fontSize: 12, color: 'var(--mk-coffee-light)', marginTop: 8 }}>
        v 1.0 · MintKitchen
      </div>
    </aside>
  );
}

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--mk-muted)', fontSize: 16 }}>
      Загрузка MintKitchen...
    </div>
  );
}

function WithSidebar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ width: 8, background: 'var(--mk-coffee)', flexShrink: 0 }} />
      <main style={{ flex: 1, minHeight: '100vh', overflow: 'auto' }}>{children}</main>
    </div>
  );
}

function LoginRoute() {
  const navigate = useNavigate();
  return <AuthApp path="/login" onGoRegister={() => navigate('/register')} onSuccess={() => navigate('/')} />;
}

function RegisterRoute() {
  const navigate = useNavigate();
  return <AuthApp path="/register" onGoLogin={() => navigate('/login')} onSuccess={() => navigate('/')} />;
}

function ProfileRoute() {
  const navigate = useNavigate();
  return (
    <AuthApp
      path="/profile"
      onLogout={() => navigate('/login')}
      onOpenRecipe={(id) => navigate('/recipes')}  // ← ДОБАВЛЕНО
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/register" element={<RegisterRoute />} />
          <Route path="/" element={<WithSidebar><HomeApp /></WithSidebar>} />
          <Route path="/profile" element={<WithSidebar><ProfileRoute /></WithSidebar>} />
          <Route path="/recipes" element={<WithSidebar><LazyVueApp loader={loadRecipes} /></WithSidebar>} />
          <Route path="/video" element={<WithSidebar><LazyVueApp loader={loadVideo} /></WithSidebar>} />
          <Route path="/admin" element={<WithSidebar><LazyVueApp loader={loadAdmin} /></WithSidebar>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
