"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';

type WatchlistContextType = {
  watchlist: string[];
  notes: { [kod: string]: string };
  addToWatchlist: (kod: string) => void;
  removeFromWatchlist: (kod: string) => void;
  isInWatchlist: (kod: string) => boolean;
  addNote: (kod: string, note: string) => void;
  getNote: (kod: string) => string;
};

const defaultContext: WatchlistContextType = {
  watchlist: [],
  notes: {},
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  isInWatchlist: () => false,
  addNote: () => {},
  getNote: () => "",
};

const WatchlistContext = createContext<WatchlistContextType>(defaultContext);

export const useWatchlist = () => useContext(WatchlistContext);

type WatchlistProviderProps = {
  children: ReactNode;
};

export const WatchlistProvider = ({ children }: WatchlistProviderProps) => {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [notes, setNotes] = useState<{ [kod: string]: string }>({});

  // localStorage'dan watchlist'i ve notları yükle
  useEffect(() => {
    try {
      const savedWatchlist = localStorage.getItem('watchlist');
      if (savedWatchlist) {
        setWatchlist(JSON.parse(savedWatchlist));
      }
      
      const savedNotes = localStorage.getItem('stockNotes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
    }
  }, []);

  // Watchlist değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);
  
  // Notlar değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('stockNotes', JSON.stringify(notes));
  }, [notes]);

  // Watchlist'e hisse ekle
  const addToWatchlist = (kod: string) => {
    if (!watchlist.includes(kod)) {
      setWatchlist([...watchlist, kod]);
    }
  };

  // Watchlist'ten hisse çıkar
  const removeFromWatchlist = (kod: string) => {
    setWatchlist(watchlist.filter(item => item !== kod));
  };

  // Hisse watchlist'te mi kontrol et
  const isInWatchlist = (kod: string): boolean => {
    return watchlist.includes(kod);
  };
  
  // Hisse notu ekle veya güncelle
  const addNote = (kod: string, note: string) => {
    setNotes(prevNotes => ({
      ...prevNotes,
      [kod]: note
    }));
  };
  
  // Hisse notu al
  const getNote = (kod: string): string => {
    return notes[kod] || "";
  };

  return (
    <WatchlistContext.Provider value={{ 
      watchlist, 
      notes, 
      addToWatchlist, 
      removeFromWatchlist, 
      isInWatchlist,
      addNote,
      getNote
    }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export default WatchlistContext; 