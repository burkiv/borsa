"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";

interface BorsaData {
  [key: string]: any;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const stocksParam = searchParams.get("stocks");
  const stocksToCompare = stocksParam ? stocksParam.split(",") : [];

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [stocksData, setStocksData] = useState<BorsaData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headersMap, setHeadersMap] = useState<{[key: string]: string}>({});

  // Excel dosyasından veri yükle
  useEffect(() => {
    // searchParams değişikliğinden etkilenmemesi için stocksToCompare'i doğrudan kullanmıyoruz
    const stocksToFetch = [...stocksToCompare];
    
    const fetchData = async () => {
      try {
        if (stocksToFetch.length < 2) {
          setError("Karşılaştırma için en az 2 hisse seçmelisiniz.");
          setLoading(false);
          return;
        }

        setLoading(true);
        const response = await fetch("/borsa_istanbul.xlsx");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        
        // İlk çalışma sayfasını al
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Verileri JSON'a dönüştür
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
        
        // Seçilen hisseleri filtrele
        const selectedStocks = cleanedData.filter(stock => 
          stocksToFetch.includes(String(stock[headersObj.kod]))
        );
        
        setStocksData(selectedStocks);
        setLoading(false);
      } catch (err) {
        console.error("Veri yüklenirken hata oluştu:", err);
        setError("Excel dosyası yüklenirken bir hata oluştu.");
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocksParam]);

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
      ozsermaye: findHeader(["özsermaye karlılığı", "özsermaye karlilik", "Özsermaye karlılığı", "karlılık"]),
      kapanis: findHeader(["kapanış(tl)", "kapanış (tl)", "kapanis(tl)", "Kapanış(TL)"]),
      piyasa: findHeader(["piyasa değeri(mn tl)", "piyasa değeri (mn tl)", "Piyasa Değeri(mn TL)"]),
      aciklik: findHeader(["halka açıklıkoranı (%)", "halka açıklık oran", "halka açık", "Halka AçıklıkOranı (%)"]),
      sermaye: findHeader(["ödenmiş sermaye (mn tl)", "ödenmiş sermaye(mn tl)", "Ödenmiş Sermaye (mn tl)"]),
      fk: findHeader(["fk", "f/k", "FK", "Fiyat Kazanç"]),
      pddd: findHeader(["pd/dd", "pd dd", "PD/DD"]),
      fdFavok: findHeader(["fd/favök", "fd/favok", "FD/FAVÖK"]),
    };
  };

  // Sayısal değer formatı kontrol ve dönüştürme
  const formatValue = (value: any, isNumeric = false): string => {
    if (value === undefined || value === null || value === "") {
      return "—";
    }
    
    if (isNumeric) {
      const numVal = parseFloat(String(value));
      if (!isNaN(numVal)) {
        return numVal.toLocaleString('tr-TR', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 2 
        });
      }
    }
    
    return String(value);
  };

  // Karşılaştırmada hangi hücrenin en iyi olduğunu belirleme
  const getBestCell = (row: BorsaData[], field: keyof typeof headersMap, isHigherBetter: boolean): number[] => {
    const goodValues = row
      .map((item, index) => ({
        value: parseFloat(String(item[headersMap[field]])),
        index
      }))
      .filter(({ value }) => !isNaN(value) && value > 0);

    if (goodValues.length === 0) return [];

    if (isHigherBetter) {
      const maxValue = Math.max(...goodValues.map(item => item.value));
      return goodValues
        .filter(item => item.value === maxValue)
        .map(item => item.index);
    } else {
      const minValue = Math.min(...goodValues.map(item => item.value));
      return goodValues
        .filter(item => item.value === minValue)
        .map(item => item.index);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4 text-white">Yükleniyor...</h1>
          <p className="text-gray-200">Hisse verileri yükleniyor, lütfen bekleyiniz.</p>
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
          <Link href="/" className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  // En iyi hücreler için hesaplama
  const bestFK = getBestCell(stocksData, 'fk', false); // FK için düşük değer daha iyi
  const bestPDDD = getBestCell(stocksData, 'pddd', false); // PD/DD için düşük değer daha iyi
  const bestFDFavok = getBestCell(stocksData, 'fdFavok', false); // FD/FAVÖK için düşük değer daha iyi
  const bestOzsermaye = getBestCell(stocksData, 'ozsermaye', true); // Özsermaye karlılığı için yüksek değer daha iyi
  const bestKapanis = getBestCell(stocksData, 'kapanis', false); // Fiyat için düşük değer daha iyi
  
  return (
    <div className="container mx-auto p-4 md:p-6 bg-gray-900">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-white">Hisse Karşılaştırma</h1>
      
      {/* Navigasyon Menüsü */}
      <div className="mb-6 flex justify-center">
        <nav className="flex space-x-4">
          <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline">
            Ana Sayfa
          </Link>
          <Link href="/mylist" className="text-blue-400 hover:text-blue-300 hover:underline">
            İzleme Listem
          </Link>
        </nav>
      </div>
      
      {stocksData.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-200 mb-4">Karşılaştırılacak hisse bulunamadı.</p>
          <Link href="/" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-500">
            Ana Sayfaya Dön
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-200 uppercase tracking-wider">Oran/Değer</th>
                {stocksData.map((stock, index) => (
                  <th key={index} className="px-4 py-3 text-center text-xs font-bold text-gray-200 uppercase tracking-wider">
                    <Link href={`/hisse/${stock[headersMap.kod]}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                      {stock[headersMap.kod]}
                    </Link>
                    <div className="text-xs font-normal text-gray-400 mt-1">
                      {stock[headersMap.hisse]}
                    </div>
                    <div className="text-xs font-normal text-gray-500 mt-1">
                      {stock[headersMap.sektör]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {/* F/K Oranı */}
              <tr className="hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200 font-medium">F/K Oranı</td>
                {stocksData.map((stock, index) => (
                  <td 
                    key={index} 
                    className={`px-4 py-3 whitespace-nowrap text-right ${bestFK.includes(index) ? "bg-green-800 text-white" : "text-gray-200"}`}
                  >
                    {formatValue(stock[headersMap.fk], true)}
                  </td>
                ))}
              </tr>
              {/* PD/DD Oranı */}
              <tr className="hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200 font-medium">PD/DD Oranı</td>
                {stocksData.map((stock, index) => (
                  <td 
                    key={index} 
                    className={`px-4 py-3 whitespace-nowrap text-right ${bestPDDD.includes(index) ? "bg-green-800 text-white" : "text-gray-200"}`}
                  >
                    {formatValue(stock[headersMap.pddd], true)}
                  </td>
                ))}
              </tr>
              {/* FD/FAVÖK Oranı */}
              <tr className="hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200 font-medium">FD/FAVÖK Oranı</td>
                {stocksData.map((stock, index) => (
                  <td 
                    key={index} 
                    className={`px-4 py-3 whitespace-nowrap text-right ${bestFDFavok.includes(index) ? "bg-green-800 text-white" : "text-gray-200"}`}
                  >
                    {formatValue(stock[headersMap.fdFavok], true)}
                  </td>
                ))}
              </tr>
              {/* Özsermaye Karlılığı */}
              <tr className="hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200 font-medium">Özsermaye Karlılığı</td>
                {stocksData.map((stock, index) => (
                  <td 
                    key={index} 
                    className={`px-4 py-3 whitespace-nowrap text-right ${bestOzsermaye.includes(index) ? "bg-green-800 text-white" : "text-gray-200"}`}
                  >
                    {formatValue(stock[headersMap.ozsermaye], true)}
                  </td>
                ))}
              </tr>
              {/* Kapanış Fiyatı */}
              <tr className="hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200 font-medium">Kapanış Fiyatı (TL)</td>
                {stocksData.map((stock, index) => (
                  <td 
                    key={index} 
                    className={`px-4 py-3 whitespace-nowrap text-right ${bestKapanis.includes(index) ? "bg-green-800 text-white" : "text-gray-200"}`}
                  >
                    {formatValue(stock[headersMap.kapanis], true)}
                  </td>
                ))}
              </tr>
              {/* Piyasa Değeri */}
              <tr className="hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200 font-medium">Piyasa Değeri (mn TL)</td>
                {stocksData.map((stock, index) => (
                  <td key={index} className="px-4 py-3 whitespace-nowrap text-right text-gray-200">
                    {formatValue(stock[headersMap.piyasa], true)}
                  </td>
                ))}
              </tr>
              {/* Halka Açıklık */}
              <tr className="hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200 font-medium">Halka Açıklık (%)</td>
                {stocksData.map((stock, index) => (
                  <td key={index} className="px-4 py-3 whitespace-nowrap text-right text-gray-200">
                    {formatValue(stock[headersMap.aciklik], true)}
                  </td>
                ))}
              </tr>
              {/* Ödenmiş Sermaye */}
              <tr className="hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-gray-200 font-medium">Ödenmiş Sermaye (mn TL)</td>
                {stocksData.map((stock, index) => (
                  <td key={index} className="px-4 py-3 whitespace-nowrap text-right text-gray-200">
                    {formatValue(stock[headersMap.sermaye], true)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-6 text-center">
        <Link href="/" className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
} 