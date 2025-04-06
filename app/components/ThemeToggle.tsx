"use client";

import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration için mounted kontrolü
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Hydration hatalarını önlemek için sunucu tarafında bir şey render etmiyoruz
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center p-2 h-8 w-14 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-600 shadow-inner"
      aria-label={theme === 'dark' ? 'Açık mod' : 'Koyu mod'}
    >
      <div
        className={`absolute left-1 transform transition-transform duration-300 ease-in-out ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {theme === 'dark' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </div>
    </button>
  );
} 