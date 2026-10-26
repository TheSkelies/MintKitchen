/**
 * Этот файл нужен ТОЛЬКО для запуска auth отдельно (для отладки).
 * В продакшене хост (host) загружает AuthApp через Module Federation.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthApp from './AuthApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthApp />
  </React.StrictMode>
);