import React from 'react';
import type { Product } from '@mintkitchen/api';

interface Props {
  product: Product;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function ProductCard({ product, selected, onToggleSelect, onEdit, onDelete }: Props) {
  const daysLeft = Math.ceil(
    (new Date(product.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysLeft <= 3;
  const badgeColor = isExpiringSoon ? 'var(--mk-blue)' : 'var(--mk-mint)';

  return (
    <div style={{
      width: 320, height: 180,
      background: 'white', borderRadius: 20,
      border: selected ? '2px solid var(--mk-coffee)' : '1px solid var(--mk-border)',
      padding: 22,
      display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 8px 24px rgba(105,77,75,0.06)',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(product.id)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: badgeColor }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onEdit(product)}
            title="Редактировать"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mk-muted)', fontSize: 14 }}
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(product.id)}
            title="Удалить"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mk-muted)', fontSize: 16 }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--mk-coffee)' }}>
        {product.name}
      </div>
      <div style={{ fontSize: 13, color: 'var(--mk-muted)' }}>
        До {new Date(product.expiresAt).toLocaleDateString('ru-RU')}
      </div>

      <div style={{
        alignSelf: 'flex-start',
        padding: '6px 12px', borderRadius: 999,
        background: badgeColor, color: 'var(--mk-coffee)',
        fontSize: 12, fontWeight: 600,
      }}>
        {daysLeft > 0 ? `${daysLeft} дн.` : 'истёк'}
      </div>
    </div>
  );
}