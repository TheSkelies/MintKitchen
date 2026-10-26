import React, { useEffect, useState } from 'react';
import VueWrapper from './VueWrapper';

interface Props {
  loader: () => Promise<any>;
}

export default function LazyVueApp({ loader }: Props) {
  const [mountFn, setMountFn] = useState<((el: HTMLElement) => () => void) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loader()
      .then((mod) => {
        // MF-плагин может отдать mount разными способами
        const mountCandidate =
          (typeof mod?.mount === 'function' && mod.mount) ||
          (typeof mod?.default?.mount === 'function' && mod.default.mount) ||
          (typeof mod?.default === 'function' && mod.default);

        if (mountCandidate) {
          setMountFn(() => mountCandidate);
        } else {
          setError('Модуль не экспортирует mount()');
        }
      })
      .catch((e) => {
        console.error('Ошибка загрузки Vue-модуля', e);
        setError(e.message);
      });
  }, [loader]);

  if (error) return <div style={{ padding: 48, color: 'red' }}>Ошибка: {error}</div>;
  if (!mountFn) return <div style={{ padding: 48 }}>Загрузка модуля...</div>;

  return <VueWrapper mount={mountFn} />;
}