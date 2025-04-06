import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WatchlistProvider } from "./context/WatchlistContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Borsa İstanbul Analiz",
  description: "Borsa İstanbul hisselerini analiz etmek için geliştirilmiş bir uygulama",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-200`}
      >
        <ThemeProvider>
          <WatchlistProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                {children}
              </main>
              <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4 text-center text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300 ease-in-out">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  © {new Date().getFullYear()} BIST Analiz - Tüm hakları saklıdır
                </div>
              </footer>
            </div>
          </WatchlistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
