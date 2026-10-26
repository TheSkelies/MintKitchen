import React, { useEffect, useRef } from 'react';

interface Props {
  mount: (el: HTMLElement) => () => void;
}

/**
 * React-обёртка для Vue-компонента.
 * Монтирует Vue-приложение в <div> через mount()-функцию из remote.
 */
export default function VueWrapper({ mount }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !mount) return;

    const unmount = mount(containerRef.current);

    return () => {
      if (typeof unmount === 'function') unmount();
    };
  }, [mount]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: '100vh' }} />;
}