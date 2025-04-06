"use client";

import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-md transition-colors duration-300 ease-in-out border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400 transition-colors duration-300 ease-in-out animate-pulse-slow">
                BIST Analiz
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                href="/" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-300 ease-in-out
                  ${isActive('/') 
                    ? 'border-primary-500 text-gray-900 dark:text-white' 
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                Ana Sayfa
              </Link>
              <Link 
                href="/mylist" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-300 ease-in-out
                  ${isActive('/mylist') 
                    ? 'border-primary-500 text-gray-900 dark:text-white' 
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                İzleme Listem
              </Link>
              <Link 
                href="/compare" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-300 ease-in-out
                  ${isActive('/compare') 
                    ? 'border-primary-500 text-gray-900 dark:text-white' 
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                Karşılaştırma
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      {/* Mobil menü */}
      <div className="sm:hidden border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 text-center">
          <Link 
            href="/" 
            className={`py-2 text-sm font-medium transition-colors duration-300 ease-in-out
              ${isActive('/') 
                ? 'text-primary-600 dark:text-primary-400 border-t-2 border-primary-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Ana Sayfa
          </Link>
          <Link 
            href="/mylist" 
            className={`py-2 text-sm font-medium transition-colors duration-300 ease-in-out
              ${isActive('/mylist') 
                ? 'text-primary-600 dark:text-primary-400 border-t-2 border-primary-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            İzleme Listem
          </Link>
          <Link 
            href="/compare" 
            className={`py-2 text-sm font-medium transition-colors duration-300 ease-in-out
              ${isActive('/compare') 
                ? 'text-primary-600 dark:text-primary-400 border-t-2 border-primary-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Karşılaştırma
          </Link>
        </div>
      </div>
    </nav>
  );
} 