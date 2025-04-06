"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "../context/WatchlistContext";
import * as XLSX from "xlsx";

interface BorsaData {
  [key: string]: any;
}

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [watchlistData, setWatchlistData] = useState<BorsaData[]>([]);
  const [allData, setAllData] = useState<BorsaData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headersMap, setHeadersMap] = useState<{[key: string]: string}>({});

  // Verileri yükle
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
        
        // Headers'ı ayarla
        if (cleanedData.length > 0) {
          setHeaders(Object.keys(cleanedData[0]));
        }
        
        // Başlık eşlemelerini oluştur
        const headersObj = createHeadersMap(Object.keys(cleanedData[0]));
        setHeadersMap(headersObj);
        
        setAllData(cleanedData);
        setLoading(false);
      } catch (err) {
        console.error("Veri yüklenirken hata oluştu:", err);
        setError("Excel dosyası yüklenirken bir hata oluştu. Lütfen dosyanın doğru formatta olduğundan emin olun.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Başlık eşlemelerini oluştur
  const createHeadersMap = (headers: string[]) => {
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

    return {
      kod: findHeader(["kod", "Kod"]),
      hisse: findHeader(["hisse adı", "hisse adi", "Hisse Adı"]),
      sektör: findHeader(["sektör", "sektor", "Sektör"]),
      fk: findHeader(["fk", "f/k", "FK", "Fiyat Kazanç"]),
      pddd: findHeader(["pd/dd", "pd dd", "PD/DD"]),
      fdFavok: findHeader(["fd/favök", "fd/favok", "FD/FAVÖK"]),
    };
  };

  // watchlist veya allData değiştiğinde izleme listesindeki hisseleri filtrele
  useEffect(() => {
    if (allData.length > 0 && watchlist.length > 0 && headersMap.kod) {
      const filteredData = allData.filter(item => 
        watchlist.includes(String(item[headersMap.kod]))
      );
      setWatchlistData(filteredData);
    } else {
      setWatchlistData([]);
    }
  }, [allData, watchlist, headersMap]);

  // Sayısal değer formatı kontrol ve dönüştürme
  const formatValue = (value: any, isNumeric = false): string => {
    if (value === undefined || value === null || value === "") {
      return "—";
    }
    
    if (isNumeric) {
      const numVal = parseFloat(String(value));
      if (!isNaN(numVal)) {
        // 2 ondalıklı gösterim, gereksiz sıfırları kaldır
        return numVal.toLocaleString('tr-TR', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 2 
        });
      }
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4 text-white">Yükleniyor...</h1>
          <p className="text-gray-200">Veriler yükleniyor, lütfen bekleyiniz.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center bg-red-900 p-6 rounded-lg max-w-md">
          <h1 className="text-2xl font-semibold text-white mb-4">Hata!</h1>
          <p className="text-gray-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-900">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white">İzleme Listem</h1>
      
      {/* Navigasyon Menüsü */}
      <div className="mb-6 flex justify-center">
        <nav className="flex space-x-4">
          <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline">
            Ana Sayfa
          </Link>
          <Link href="/mylist" className="text-blue-400 hover:text-blue-300 hover:underline font-bold">
            İzleme Listem
          </Link>
        </nav>
      </div>
      
      {watchlistData.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-200 mb-4">İzleme listenizde henüz hisse bulunmuyor.</p>
          <Link href="/" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-500">
            Ana Sayfaya Dön
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-200">
            <div>Toplam: {watchlistData.length} hisse</div>
          </div>
          
          {/* Tablo */}
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Kod</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Hisse Adı</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Sektör</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-200 uppercase tracking-wider">FK</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-200 uppercase tracking-wider">PD/DD</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-200 uppercase tracking-wider">FD/FAVÖK</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-200 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {watchlistData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-200">
                      <Link href={`/hisse/${row[headersMap.kod]}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                        {formatValue(row[headersMap.kod])}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-200">{formatValue(row[headersMap.hisse])}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-200">{formatValue(row[headersMap.sektör])}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-200">{formatValue(row[headersMap.fk], true)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-200">{formatValue(row[headersMap.pddd], true)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-200">{formatValue(row[headersMap.fdFavok], true)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button 
                        onClick={() => removeFromWatchlist(String(row[headersMap.kod]))}
                        className="bg-red-700 text-white py-1 px-3 rounded hover:bg-red-600"
                      >
                        Listeden Çıkar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
} 