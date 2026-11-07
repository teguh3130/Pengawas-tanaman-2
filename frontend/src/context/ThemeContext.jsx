import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'plant_monitor_theme';

/**
 * Mendapatkan preferensi awal:
 * Mengutamakan nilai di localStorage, fallback ke 'auto'.
 */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved;
    }
  } catch (e) {
    // LocalStorage mungkin tidak tersedia di beberapa environment
  }
  return 'auto';
}

/**
 * Mendeteksi tema OS saat ini ('light' atau 'dark').
 */
function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Fallback default
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const initial = getInitialTheme();
    return initial === 'auto' ? getSystemTheme() : initial;
  });

  // Terapkan attribute data-theme ke elemen <html>
  const applyThemeToDOM = useCallback((applied) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', applied);
      // Sinkronkan juga class untuk styling utilitas
      if (applied === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Update tema dan simpan ke localStorage
  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'auto') {
      return;
    }
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      // Ignored
    }

    const resolved = newTheme === 'auto' ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
  }, [applyThemeToDOM]);

  // Efek memantau perubahan tema OS jika dalam mode 'auto'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e) => {
      if (theme === 'auto') {
        const sysTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(sysTheme);
        applyThemeToDOM(sysTheme);
      }
    };

    // Initial sync
    const initialResolved = theme === 'auto' ? (mediaQuery.matches ? 'dark' : 'light') : theme;
    setResolvedTheme(initialResolved);
    applyThemeToDOM(initialResolved);

    // Listener modern & legacy
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
      return () => mediaQuery.removeListener(handleSystemChange);
    }
  }, [theme, applyThemeToDOM]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme harus digunakan di dalam ThemeProvider');
  }
  return context;
}

export default ThemeContext;

