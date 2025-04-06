"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';

type Theme = 'dark' | 'light';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const defaultContext: ThemeContextType = {
  theme: 'light', // Varsayılan tema aydınlık olsun
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

export const useTheme = () => useContext(ThemeContext);

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // localStorage'dan tema tercihini yükle
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem('theme');
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        // Sistem tercihini kullan
        setTheme(systemTheme);
        if (systemTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (error) {
      console.error('Tema yüklenirken hata:', error);
    }
  }, []);

  // Tema değiştir
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('Tema kaydedilirken hata:', error);
      }
      return newTheme;
    });
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext; 