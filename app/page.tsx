"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useTheme } from "./context/ThemeContext";


// BorsaData tipi 
type BorsaData = {
  [key: string]: any;
};

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [hisseListesi, setHisseListesi] = useState<BorsaData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [headersMap, setHeadersMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("Tümü");
  const [sectors, setSectors] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("kod");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/borsa_istanbul.xlsx");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        
        // İlk çalışma sayfasını al
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Verileri JSON'a dönüştür - raw:false ile string formatında al
        const jsonData = XLSX.utils.sheet_to_json<BorsaData>(worksheet, { raw: false });
        
        // Verileri temizle ve sayısal değerleri düzelt
        const cleanedData = jsonData.map(row => {
          const newRow: { [key: string]: any } = {};

          for (const key in row) {
            if (!Object.hasOwn(row, key)) continue;

            let value = row[key];

            if (typeof value === "string") {
              const raw = value.trim();

              if (raw.includes('%')) {
                value = parseFloat(raw.replace('%', '').replace(',', '.'));
              } else if (/^-?\d+,\d+$/.test(raw)) {
                value = parseFloat(raw.replace(',', '.'));
              } else {
                const num = parseFloat(raw.replace(',', '.'));
                value = isNaN(num) ? raw : num;
              }
            }

            newRow[key] = value;
          }

          return newRow;
        });
        
        // Başlık eşlemelerini bul
        if (cleanedData.length > 0) {
          const headers = Object.keys(cleanedData[0]);
          
          const findHeader = (searchTerms: string[]): string => {
            // Önce tam eşleşmeyi dene
            for (const term of searchTerms) {
              const exactMatch = headers.find(h => h.toLowerCase() === term.toLowerCase());
              if (exactMatch) return exactMatch;
            }
            
            // Tam eşleşme yoksa içerme kontrolü yap
            const found = headers.find(h => 
              searchTerms.some(term => h.toLowerCase().includes(term.toLowerCase()))
            );
            
            return found || "";
          };
          
          const headersMapObj = {
            kod: findHeader(["kod", "Kod"]),
            hisse: findHeader(["hisse adı", "hisse adi", "Hisse Adı"]),
            sektör: findHeader(["sektör", "sektor", "Sektör"]),
            ozsermaye: findHeader(["özsermaye karlılığı", "özsermaye karlilik", "Özsermaye karlılığı", "karlılık"]),
            kapanis: findHeader(["kapanış(tl)", "kapanış (tl)", "kapanis(tl)", "Kapanış(TL)"]),
            piyasa: findHeader(["piyasa değeri(mn tl)", "piyasa değeri (mn tl)", "Piyasa Değeri(mn TL)"]),
            aciklik: findHeader(["halka açıklıkoranı (%)", "halka açıklık oran", "halka açık", "Halka AçıklıkOranı (%)"]),
            sermaye: findHeader(["ödenmiş sermaye (mn tl)", "ödenmiş sermaye(mn tl)", "Ödenmiş Sermaye (mn tl)"]),
            fk: findHeader(["fk", "f/k", "FK", "Fiyat Kazanç"]),
            pddd: findHeader(["pd/dd", "pd dd", "PD/DD"]),
            fdFavok: findHeader(["fd/favök", "fd/favok", "FD/FAVÖK"]),
          };
          
          setHeadersMap(headersMapObj);
          setHisseListesi(cleanedData);
          
          // Sektörleri ayıkla
          const uniqueSectors = [...new Set(cleanedData.map(item => item[headersMapObj.sektör]))].filter(Boolean);
          setSectors(["Tümü", ...uniqueSectors.sort()]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Veri yüklenirken hata oluştu:", err);
        setError("Veri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Sıralama fonksiyonu
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Filtrelenmiş ve sıralanmış hisse listesi
  const filteredAndSortedList = useMemo(() => {
    // Önce filtrele
    const filtered = hisseListesi.filter(hisse => {
      const matchesSearch = 
        (hisse[headersMap.kod] && String(hisse[headersMap.kod]).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (hisse[headersMap.hisse] && String(hisse[headersMap.hisse]).toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSector = sectorFilter === "Tümü" || hisse[headersMap.sektör] === sectorFilter;
      
      return matchesSearch && matchesSector;
    });
    
    // Sonra sırala
    return [...filtered].sort((a, b) => {
      let aValue = a[headersMap[sortField as keyof typeof headersMap] || sortField];
      let bValue = b[headersMap[sortField as keyof typeof headersMap] || sortField];
      
      // Sayısal değerleri doğru şekilde karşılaştır
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      // String değerleri karşılaştır
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      return sortDirection === "asc" 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [hisseListesi, searchTerm, sectorFilter, sortField, sortDirection, headersMap]);
  
  // Sıralama göstergesi
  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    
    return sortDirection === "asc" ? (
      <svg className="w-4 h-4 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };
  
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Borsa İstanbul Verileri</h1>
          
          <button 
            onClick={toggleTheme}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 shadow-md"
            type="button"
          >
            {theme === 'dark' ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Aydınlık Mod
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Karanlık Mod
              </>
            )}
          </button>
        </div>
        
        <div className="mb-8 rounded-xl overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sektör filtresi */}
              <div>
                <label htmlFor="sector" className="block text-sm font-medium mb-1">Sektör Filtresi</label>
                <select
                  id="sector"
                  className="block w-full px-3 py-2 rounded-lg transition-colors duration-200 border text-sm"
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                >
                  {sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Arama kutusu */}
              <div className="col-span-2">
                <label htmlFor="search" className="block text-sm font-medium mb-1">Hisse Adı veya Kod Ara</label>
                <div className="relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="search"
                    className="block w-full pl-10 pr-3 py-2 rounded-lg transition-colors duration-200 border text-sm"
                    placeholder="Kod veya hisse adı ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
            <p>Hisse verileri yükleniyor...</p>
          </div>
        )}
        
        {error && (
          <div className="rounded-xl p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">Hata</h3>
                <div className="mt-2 text-sm">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!loading && !error && (
          <div className="mb-4">
            <p className="text-sm mb-2">Toplam: {filteredAndSortedList.length} hisse</p>
          </div>
        )}
        
        {!loading && !error && filteredAndSortedList.length > 0 && (
          <div className="rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort('kod')}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center">
                        KOD {getSortIcon('kod')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('hisse')}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center">
                        HİSSE ADI {getSortIcon('hisse')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('sektör')}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center">
                        SEKTÖR {getSortIcon('sektör')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('ozsermaye')}
                      className="cursor-pointer text-right"
                    >
                      <div className="flex items-center justify-end">
                        <span>ÖZSERMAYE KARLILIĞI</span> {getSortIcon('ozsermaye')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('kapanis')}
                      className="cursor-pointer text-right"
                    >
                      <div className="flex items-center justify-end">
                        <span>KAPANIŞ (TL)</span> {getSortIcon('kapanis')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('piyasa')}
                      className="cursor-pointer text-right"
                    >
                      <div className="flex items-center justify-end">
                        <span>PİYASA DEĞERİ (MN TL)</span> {getSortIcon('piyasa')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('aciklik')}
                      className="cursor-pointer text-right"
                    >
                      <div className="flex items-center justify-end">
                        <span>HALKA AÇIKLIK (%)</span> {getSortIcon('aciklik')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('fk')}
                      className="cursor-pointer text-right"
                    >
                      <div className="flex items-center justify-end">
                        <span>F/K</span> {getSortIcon('fk')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('pddd')}
                      className="cursor-pointer text-right"
                    >
                      <div className="flex items-center justify-end">
                        <span>PD/DD</span> {getSortIcon('pddd')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('fdFavok')}
                      className="cursor-pointer text-right"
                    >
                      <div className="flex items-center justify-end">
                        <span>FD/FAVÖK</span> {getSortIcon('fdFavok')}
                      </div>
                    </th>
                    <th className="text-center">
                      SKOR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedList.map((hisse, index) => {
                    // Değerlere göre renkler için sınıflar belirle
                    const fkClass = typeof hisse[headersMap.fk] === 'number' && hisse[headersMap.fk] > 0 && hisse[headersMap.fk] < 10
                      ? 'text-positive' : hisse[headersMap.fk] > 20 ? 'text-negative' : '';
                    
                    const pdddClass = typeof hisse[headersMap.pddd] === 'number' && hisse[headersMap.pddd] > 0 && hisse[headersMap.pddd] < 1.5
                      ? 'text-positive' : hisse[headersMap.pddd] > 3 ? 'text-negative' : '';
                    
                    const fdFavokClass = typeof hisse[headersMap.fdFavok] === 'number' && hisse[headersMap.fdFavok] > 0 && hisse[headersMap.fdFavok] < 8
                      ? 'text-positive' : hisse[headersMap.fdFavok] > 12 ? 'text-negative' : '';
                    
                    return (
                      <tr key={index}>
                        <td className="font-medium">
                          <Link href={`/hisse/${hisse[headersMap.kod]}`} className="text-blue-600 hover:underline">
                            {hisse[headersMap.kod]}
                          </Link>
                        </td>
                        <td>
                          {hisse[headersMap.hisse]}
                        </td>
                        <td>
                          {hisse[headersMap.sektör]}
                        </td>
                        <td className="text-right">
                          {typeof hisse[headersMap.ozsermaye] === 'number' 
                            ? hisse[headersMap.ozsermaye].toLocaleString('tr-TR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) 
                            : hisse[headersMap.ozsermaye]}
                        </td>
                        <td className="text-right">
                          {typeof hisse[headersMap.kapanis] === 'number' 
                            ? hisse[headersMap.kapanis].toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
                            : hisse[headersMap.kapanis]}
                        </td>
                        <td className="text-right">
                          {typeof hisse[headersMap.piyasa] === 'number' 
                            ? hisse[headersMap.piyasa].toLocaleString('tr-TR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) 
                            : hisse[headersMap.piyasa]}
                        </td>
                        <td className="text-right">
                          {typeof hisse[headersMap.aciklik] === 'number' 
                            ? hisse[headersMap.aciklik].toLocaleString('tr-TR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) 
                            : hisse[headersMap.aciklik]}
                        </td>
                        <td className={`text-right ${fkClass}`}>
                          {typeof hisse[headersMap.fk] === 'number' 
                            ? hisse[headersMap.fk].toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
                            : hisse[headersMap.fk]}
                        </td>
                        <td className={`text-right ${pdddClass}`}>
                          {typeof hisse[headersMap.pddd] === 'number' 
                            ? hisse[headersMap.pddd].toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
                            : hisse[headersMap.pddd]}
                        </td>
                        <td className={`text-right ${fdFavokClass}`}>
                          {typeof hisse[headersMap.fdFavok] === 'number' 
                            ? hisse[headersMap.fdFavok].toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
                            : hisse[headersMap.fdFavok]}
                        </td>
                        <td className="text-right text-neutral font-bold">
                          {/* Skor hesaplanabilir, şimdilik rastgele değerler */}
                          {(index % 10 < 3) ? (Math.random() * 3 + 6).toFixed(2) : (Math.random() * 6).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {!loading && !error && filteredAndSortedList.length === 0 && (
          <div className="rounded-xl p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-3 text-lg font-medium">Sonuç bulunamadı</h3>
            <p className="mt-2">
              Aramanıza uygun hisse bulunamadı. Lütfen farklı bir arama terimi deneyin veya filtrelerinizi değiştirin.
            </p>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md"
                onClick={() => {
                  setSearchTerm("");
                  setSectorFilter("Tümü");
                }}
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
