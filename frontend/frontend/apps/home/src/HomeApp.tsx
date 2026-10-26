import React, { useState, useEffect } from 'react';
import { ProductsProvider, useProducts } from './store';
import ProductCard from './components/ProductCard';
import AddProductModal from './components/AddProductModal';
import type { Product, ProductInput } from '@mintkitchen/api';

// Ключ для «уже уведомили» — чтобы не спамить при каждом открытии
const NOTIFIED_KEY = 'mk_expiring_notified';

function HomeContent() {
  const {
    products, loading, sortBy, selectedIds,
    toggleSelect, selectAll, clearSelection,
    add, update, remove, setSortBy,
    transferToIngredients, checkExpiring,
  } = useProducts();

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // ============================================================
  // УВЕДОМЛЕНИЯ О СКОРО ИСТЕКАЮЩИХ ПРОДУКТАХ
  // ============================================================
  useEffect(() => {
    if (products.length === 0) return;

    const expiring = checkExpiring(5);
    if (expiring.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const lastNotified = localStorage.getItem(NOTIFIED_KEY);
    if (lastNotified === today) return;

    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            showNotification(expiring);
            localStorage.setItem(NOTIFIED_KEY, today);
          }
        });
      } else if (Notification.permission === 'granted') {
        showNotification(expiring);
        localStorage.setItem(NOTIFIED_KEY, today);
      }
    }
  }, [products]);

  const showNotification = (expiring: Product[]) => {
    const names = expiring.map((p) => p.name).join(', ');
    const title = '🌿 MintKitchen';
    const body = `${expiring.length} продуктов скоро испортятся: ${names}`;

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'expiring-products',
      });
    } catch (e) {
      console.warn('Уведомление не показано', e);
    }
  };

  // Кнопка «🔔 Напомнить» — вручную
  const handleRemind = () => {
    if (!('Notification' in window)) {
      alert('Браузер не поддерживает уведомления');
      return;
    }
    const expiring = checkExpiring(5);
    if (expiring.length === 0) {
      alert('Нет продуктов, которые скоро испортятся 👍');
      return;
    }
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') showNotification(expiring);
      });
    } else {
      showNotification(expiring);
    }
  };

  const openAdd = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleSubmit = async (data: ProductInput) => {
    if (editingProduct) await update(editingProduct.id, data);
    else await add(data);
  };

  const expiringCount = checkExpiring(5).length;

  return (
    <div style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--mk-coffee)' }}>
            Мои продукты
          </h1>
          <p style={{ fontSize: 14, color: 'var(--mk-muted)', marginTop: 4 }}>
            {products.length} продукта · свежесть под контролем
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleRemind}
            title="Напомнить о срочных продуктах"
            style={{
              padding: '14px 18px', borderRadius: 14, border: '1px solid var(--mk-border)',
              background: 'white', color: 'var(--mk-coffee)',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              position: 'relative',
            }}
          >
            🔔
            {expiringCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--mk-blue)', color: 'var(--mk-coffee)',
                borderRadius: 999, padding: '2px 7px', fontSize: 11, fontWeight: 700,
              }}>
                {expiringCount}
              </span>
            )}
          </button>

          <button
            onClick={openAdd}
            style={{
              padding: '14px 22px', borderRadius: 14, border: 'none',
              background: 'var(--mk-coffee)', color: 'white',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(105,77,75,0.25)',
            }}
          >
            +  Добавить продукт
          </button>
        </div>
      </div>

      {/* Кнопки переноса в ингредиенты */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap',
        padding: 16, background: 'white', borderRadius: 16,
        border: '1px solid var(--mk-border)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--mk-muted)', alignSelf: 'center', marginRight: 8 }}>
          Перенести в ингредиенты:
        </div>
        <button
          onClick={() => transferToIngredients('all')}
          style={{
            padding: '10px 16px', borderRadius: 12, border: 'none',
            background: 'var(--mk-mint)', color: 'var(--mk-coffee)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🟢 Все продукты
        </button>
        <button
          onClick={() => transferToIngredients('expiring', 5)}
          style={{
            padding: '10px 16px', borderRadius: 12, border: 'none',
            background: 'var(--mk-blue)', color: 'var(--mk-coffee)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🔴 Скоро портятся ({expiringCount})
        </button>
        <button
          onClick={() => transferToIngredients('selected')}
          disabled={selectedIds.size === 0}
          style={{
            padding: '10px 16px', borderRadius: 12, border: 'none',
            background: selectedIds.size > 0 ? 'var(--mk-coffee)' : 'var(--mk-border)',
            color: 'white',
            fontSize: 13, fontWeight: 600,
            cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          📦 Выбранные ({selectedIds.size})
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={clearSelection}
            style={{
              padding: '10px 16px', borderRadius: 12,
              border: '1px solid var(--mk-border)', background: 'white',
              color: 'var(--mk-coffee)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Снять выбор
          </button>
        )}
        {selectedIds.size === 0 && products.length > 0 && (
          <button
            onClick={selectAll}
            style={{
              padding: '10px 16px', borderRadius: 12,
              border: '1px solid var(--mk-border)', background: 'white',
              color: 'var(--mk-coffee)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Выбрать все
          </button>
        )}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, color: 'var(--mk-muted)' }}>Сортировать:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'expiresAt' | 'name')}
          style={{
            padding: '10px 16px', borderRadius: 12,
            border: '1px solid var(--mk-border)',
            background: 'white', color: 'var(--mk-coffee)',
            fontSize: 14, cursor: 'pointer',
          }}
        >
          <option value="expiresAt">Срок годности</option>
          <option value="name">Название</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color: 'var(--mk-muted)' }}>Загрузка...</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              selected={selectedIds.has(p.id)}
              onToggleSelect={toggleSelect}
              onEdit={openEdit}
              onDelete={remove}
            />
          ))}
          {products.length === 0 && (
            <div style={{ color: 'var(--mk-muted)', padding: 20 }}>
              Продуктов пока нет. Нажми «Добавить продукт».
            </div>
          )}
        </div>
      )}

      {showModal && (
        <AddProductModal
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
          onSubmit={handleSubmit}
          product={editingProduct}
        />
      )}
    </div>
  );
}

export default function HomeApp() {
  return (
    <ProductsProvider>
      <HomeContent />
    </ProductsProvider>
  );
}
