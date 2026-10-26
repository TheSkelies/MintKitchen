import React, { useEffect, useState } from 'react';
import type { Product, ProductInput } from '@mintkitchen/api';

interface Props {
  onClose: () => void;
  onSubmit: (data: ProductInput) => Promise<void>;
  product?: Product | null;
}

export default function AddProductModal({ onClose, onSubmit, product }: Props) {
  const isEdit = !!product;
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setExpiresAt(product.expiresAt.split('T')[0]);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ name, expiresAt });
      onClose();
    } catch (err) {
      console.error(err);
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
          width: 440, background: 'white', borderRadius: 24,
          padding: 32, display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 24px 60px rgba(105,77,75,0.18)',
        }}
      >
        <div style={{
          background: 'var(--mk-coffee)', color: 'white',
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontWeight: 700, marginBottom: 4,
        }}>
          <span>{isEdit ? 'Редактировать продукт' : 'Добавить продукт'}</span>
          <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--mk-mint)' }}>✕</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-coffee)' }}>Название</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Например: Молоко" required
              style={{
                width: '100%', height: 48, marginTop: 6, padding: '0 16px',
                borderRadius: 12, border: '1px solid var(--mk-border)',
                background: 'var(--mk-bg-blue)', fontSize: 15,
                color: 'var(--mk-coffee)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--mk-coffee)' }}>Срок годности</label>
            <input
              type="date" value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)} required
              style={{
                width: '100%', height: 48, marginTop: 6, padding: '0 16px',
                borderRadius: 12, border: '1px solid var(--mk-border)',
                background: 'var(--mk-bg-blue)', fontSize: 15,
                color: 'var(--mk-coffee)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '12px 24px', borderRadius: 12,
                border: '1px solid var(--mk-border)',
                background: 'white', color: 'var(--mk-coffee)',
                fontSize: 15, cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit" disabled={loading}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none',
                background: 'var(--mk-mint)', color: 'var(--mk-coffee)',
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}