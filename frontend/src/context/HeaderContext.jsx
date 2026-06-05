import { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * HeaderContext lets a page declare the action buttons (and optional
 * title/subtitle override) that the shell's topbar should render, without
 * the page owning the topbar markup. A page declares this via <PageHead>.
 *
 *   header        → { title, sub, actions } | null   (read by the topbar)
 *   setHeader(h)  → replace the current header descriptor
 */
const HeaderCtx = createContext(null);

export function useHeader() {
  const ctx = useContext(HeaderCtx);
  if (!ctx) throw new Error('useHeader must be used within a <HeaderProvider>');
  return ctx;
}

export function HeaderProvider({ children }) {
  const [header, setHeaderState] = useState(null);
  const setHeader = useCallback((h) => setHeaderState(h), []);
  const value = useMemo(() => ({ header, setHeader }), [header, setHeader]);
  return <HeaderCtx.Provider value={value}>{children}</HeaderCtx.Provider>;
}
