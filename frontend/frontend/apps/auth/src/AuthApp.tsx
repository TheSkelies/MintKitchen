import React from 'react';
import { AuthProvider } from './store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

interface AuthAppProps {
  path?: string;
  onGoRegister?: () => void;
  onGoLogin?: () => void;
  onSuccess?: () => void;
  onLogout?: () => void;
  onOpenRecipe?: (id: string) => void;  // ← ДОБАВЛЕНО
}

export default function AuthApp({
  path = '/login',
  onGoRegister,
  onGoLogin,
  onSuccess,
  onLogout,
  onOpenRecipe,  // ← ДОБАВЛЕНО
}: AuthAppProps) {
  return (
    <AuthProvider>
      {path === '/register' ? (
        <RegisterPage onGoLogin={onGoLogin} onSuccess={onSuccess} />
      ) : path === '/profile' ? (
        <ProfilePage onLogout={onLogout} onOpenRecipe={onOpenRecipe} />
      ) : (
        <LoginPage onGoRegister={onGoRegister} onSuccess={onSuccess} />
      )}
    </AuthProvider>
  );
}
