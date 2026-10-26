/**
 * Стейт продуктов через React Context.
 * 
 * ДЛЯ БЭКЕНДЕРА: продукты приходят из productsApi (packages/api/src/endpoints.ts).
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { productsApi, type Product, type ProductInput } from '@mintkitchen/api';

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  sortBy: 'expiresAt' | 'name';
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  fetchAll: () => Promise<void>;
  add: (data: ProductInput) => Promise<void>;
  update: (id: string, data: ProductInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setSortBy: (by: 'expiresAt' | 'name') => void;
  transferToIngredients: (mode: 'all' | 'expiring' | 'selected', expiringDays?: number) => void;
  checkExpiring: (days?: number) => Product[];
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

// Ключ для localStorage
const TRANSFER_KEY = 'mk_transfer_ingredients';

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'expiresAt' | 'name'>('expiresAt');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await productsApi.getSorted(sortBy);
      setProducts(data);
    } catch (e) {
      console.error('Не удалось загрузить продукты', e);
    } finally {
      setLoading(false);
    }
  };

  const add = async (data: ProductInput) => {
    const created = await productsApi.create(data);
    setProducts((prev) => [...prev, created]);
  };

  const update = async (id: string, data: ProductInput) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, name: data.name, expiresAt: data.expiresAt } : p
      )
    );
    try {
      await productsApi.update(id, data);
    } catch (e) {
      console.warn('[MintKitchen] PATCH не поддерживается бэкендом, обновлено локально', e);
    }
  };

  const remove = async (id: string) => {
    await productsApi.remove(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const changeSortBy = (by: 'expiresAt' | 'name') => {
    setSortBy(by);
  };

  // Проверка «скоро портятся»
  const checkExpiring = useCallback((days = 5): Product[] => {
    const now = Date.now();
    const threshold = days * 24 * 60 * 60 * 1000;
    return products.filter((p) => {
      const expires = new Date(p.expiresAt).getTime();
      const diff = expires - now;
      return diff > 0 && diff <= threshold;
    });
  }, [products]);

  // Перенос продуктов в ингредиенты
  const transferToIngredients = (
    mode: 'all' | 'expiring' | 'selected',
    expiringDays = 5
  ) => {
    let toTransfer: Product[] = [];
    if (mode === 'all') toTransfer = products;
    else if (mode === 'expiring') toTransfer = checkExpiring(expiringDays);
    else if (mode === 'selected') toTransfer = products.filter((p) => selectedIds.has(p.id));

    if (toTransfer.length === 0) {
      alert('Нечего переносить — нет подходящих продуктов');
      return;
    }

    const ingredientNames = toTransfer.map((p) => p.name);

    // Сохраняем в localStorage
    const existing = JSON.parse(localStorage.getItem(TRANSFER_KEY) || '[]');
    const merged = Array.from(new Set([...existing, ...ingredientNames]));
    localStorage.setItem(TRANSFER_KEY, JSON.stringify(merged));

    // Кидаем событие для recipes
    window.dispatchEvent(
      new CustomEvent('mk:transfer-ingredients', {
        detail: { ingredients: ingredientNames },
      })
    );

    alert(`✓ Перенесено ${toTransfer.length} продуктов в «Мои ингредиенты»`);
    if (mode === 'selected') clearSelection();
  };

  useEffect(() => {
    fetchAll();
  }, [sortBy]);

  return (
    <ProductsContext.Provider
      value={{
        products, loading, sortBy, selectedIds,
        toggleSelect, selectAll, clearSelection,
        fetchAll, add, update, remove, setSortBy: changeSortBy,
        transferToIngredients, checkExpiring,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be inside ProductsProvider');
  return ctx;
}