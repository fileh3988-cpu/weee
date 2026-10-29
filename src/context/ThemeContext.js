'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_THEME_ID, THEME_LIST, resolveTheme } from '@/lib/themes';

// ThemeContext = pratinjau tema untuk panel admin (toggle cepat antar tema).
// Untuk halaman event, tema ditentukan per-event dari database — bukan context ini.
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME_ID);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const applyTheme = useCallback((newTheme) => {
    const safe = resolveTheme(newTheme); // id tak dikenal -> default registry
    setTheme(safe);
    document.documentElement.setAttribute('data-theme', safe);
    return safe;
  }, []);

  useEffect(() => {
    // Load preferensi admin dari localStorage saat pertama kali buka
    const savedTheme = applyTheme(localStorage.getItem('app-theme') || DEFAULT_THEME_ID);

    // Sinkronisasi antar tab browser
    const handleStorageChange = (e) => {
      if (e.key === 'app-theme') applyTheme(e.newValue);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [applyTheme]);

  // Cycle ke tema berikutnya dalam THEME_REGISTRY — otomatis ikut saat
  // tema baru didaftarkan, tidak ada nama tema yang di-hardcode di sini.
  const toggleTheme = useCallback(() => {
    setIsTransitioning(true);
    document.body.classList.add(`theme-transitioning-${theme}`);

    const ids = THEME_LIST.map((t) => t.id);
    const next = ids[(ids.indexOf(theme) + 1) % ids.length];

    setTimeout(() => {
      applyTheme(next);
      localStorage.setItem('app-theme', next);
      document.body.classList.remove(`theme-transitioning-${theme}`);
      setIsTransitioning(false);
    }, 300);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
