import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

/**
 * CategoriesContext loads the user's categories once and shares them app-wide,
 * so pages don't each re-fetch. Backend categories store a `color` but no
 * `icon`, so we enrich each one with an inferred icon (and a fallback color)
 * here — this is the single source of truth for category visuals.
 */

const NAME_ICON_MAP = {
  groceries: 'cart',  grocery: 'cart',     food: 'coffee',     dining: 'coffee',  coffee: 'coffee', restaurant: 'coffee',
  rent: 'card',       mortgage: 'card',    housing: 'card',
  utilities: 'bolt',  electricity: 'bolt', power: 'bolt',      water: 'bolt',     gas: 'bolt',
  entertainment: 'film', streaming: 'film', movie: 'film',     netflix: 'film',
  subscription: 'receipt',
  transport: 'car',   transit: 'car',      vehicle: 'car',     fuel: 'car',       car: 'car',       uber: 'car',
  travel: 'plane',    flight: 'plane',     vacation: 'plane',  holiday: 'plane',  trip: 'plane',
  salary: 'briefcase', freelance: 'briefcase', work: 'briefcase', payroll: 'briefcase', income: 'briefcase',
  investment: 'lineChart', dividend: 'lineChart', stock: 'lineChart',
  saving: 'piggy',
  gift: 'gift',       present: 'gift',
  shopping: 'bag',    clothing: 'bag',     clothes: 'bag',     fashion: 'bag',
  health: 'heart',    medical: 'heart',    pharmacy: 'heart',  doctor: 'heart',
  fitness: 'dumbbell', gym: 'dumbbell',    sport: 'dumbbell',
  education: 'book',  school: 'book',      course: 'book',     book: 'book',
  insurance: 'shield', emergency: 'shield',
  phone: 'card',      internet: 'bolt',
};

const FALLBACK_ICONS = ['grid', 'tag', 'star', 'target', 'receipt', 'wallet'];
const PALETTE = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#10b981', '#22d3ee', '#fb7185', '#fb923c', '#f87171'];

export function iconForCategory(name = '', index = 0) {
  const lower = name.toLowerCase();
  const key = Object.keys(NAME_ICON_MAP).find(k => lower.includes(k));
  return key ? NAME_ICON_MAP[key] : FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

function enrich(cat, index) {
  return {
    ...cat,
    icon: cat.icon || iconForCategory(cat.name, index),
    color: cat.color || PALETTE[index % PALETTE.length],
  };
}

const CategoriesCtx = createContext(null);

export function useCategories() {
  const ctx = useContext(CategoriesCtx);
  if (!ctx) throw new Error('useCategories must be used within a <CategoriesProvider>');
  return ctx;
}

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/categories/');
      setCategories(data.map(enrich));
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const byId = useMemo(() => {
    const m = {};
    categories.forEach(c => { m[c.id] = c; });
    return m;
  }, [categories]);

  const catById = useCallback(
    (id) => byId[id] || { id, name: 'Uncategorized', icon: 'more', color: '#94a3b8' },
    [byId],
  );

  const value = useMemo(
    () => ({ categories, loading, refresh, catById, setCategories }),
    [categories, loading, refresh, catById],
  );

  return <CategoriesCtx.Provider value={value}>{children}</CategoriesCtx.Provider>;
}
