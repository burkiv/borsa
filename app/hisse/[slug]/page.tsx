"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useWatchlist } from "../../context/WatchlistContext";
import TradingViewWidget from "../../components/TradingViewWidget";

interface BorsaData {
  [key: string]: any;
}

// Tooltip bileşeni
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded p-2 shadow-lg z-10 whitespace-pre-line border border-gray-700 dark:border-gray-800 transition-colors duration-300">
        {text}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 overflow-hidden w-4 h-2">
          <div className="bg-gray-800 dark:bg-gray-900 rotate-45 transform origin-top-left w-4 h-4 -translate-y-1/2 transition-colors duration-300"></div>
        </div>
      </div>
    </div>
  );
}

// Başlık eşlemelerini oluştur
function createHeadersMap(headers: string[]) {
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
}

export default function HisseDetay() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const { notes, addNote, getNote, isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [noteText, setNoteText] = useState<string>("");
  
  const [hisseVeri, setHisseVeri] = useState<BorsaData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [headersMap, setHeadersMap] = useState<Record<string, string>>({});
  const [sektorVerileri, setSektorVerileri] = useState<any[]>([]);
  const [bestRatios, setBestRatios] = useState<Record<string, number>>({});
  const [isAllBest, setIsAllBest] = useState<boolean>(false);
  const [stockScore, setStockScore] = useState<number>(0);
  const [isSectorLeader, setIsSectorLeader] = useState<boolean>(false);
  const [sectorScores, setSectorScores] = useState<{
    [kod: string]: {
      kod: string;
      score: number;
      validRatios: number;
      total: number | null;
    }
  }>({});
  const [sectorAverages, setSectorAverages] = useState<{fk: number, pddd: number, fdFavok: number, ozsermaye: number, aciklik: number}>(
    {fk: 0, pddd: 0, fdFavok: 0, ozsermaye: 0, aciklik: 0}
  );
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);

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
          
          // İlgili hisseyi bul
          const bulunanHisse = cleanedData.find(row => {
            // "Kod" adlı sütunu dinamik olarak bul
            const kodKey = Object.keys(row).find(k => k.toLowerCase().includes("kod")) || headersMapObj.kod;
            return String(row[kodKey]).toUpperCase() === slug?.toUpperCase();
          });
          
          if (!bulunanHisse) {
            setError(`"${slug}" kodlu hisse bulunamadı.`);
            setLoading(false);
            return;
          }
          
          setHisseVeri(bulunanHisse);
          
          // Aynı sektördeki hisseleri bul
          const sektor = bulunanHisse[headersMapObj.sektör];
          const sektorHisseleri = cleanedData.filter(item => item[headersMapObj.sektör] === sektor);
          setSektorVerileri(sektorHisseleri);
          
          // Sektördeki en iyi değerleri bul
          const validFKs = sektorHisseleri
            .filter(item => {
              const fk = parseFloat(String(item[headersMapObj.fk]));
              return !isNaN(fk) && fk > 0;
            })
            .map(item => parseFloat(String(item[headersMapObj.fk])));
          
          const validPDDDs = sektorHisseleri
            .filter(item => {
              const pddd = parseFloat(String(item[headersMapObj.pddd]));
              return !isNaN(pddd) && pddd > 0;
            })
            .map(item => parseFloat(String(item[headersMapObj.pddd])));
          
          const validFDFavoks = sektorHisseleri
            .filter(item => {
              const fdFavok = parseFloat(String(item[headersMapObj.fdFavok]));
              return !isNaN(fdFavok) && fdFavok > 0;
            })
            .map(item => parseFloat(String(item[headersMapObj.fdFavok])));
          
          const validOzsermaye = sektorHisseleri
            .filter(item => {
              const ozsermaye = parseFloat(String(item[headersMapObj.ozsermaye]));
              return !isNaN(ozsermaye) && ozsermaye > 0;
            })
            .map(item => parseFloat(String(item[headersMapObj.ozsermaye])));
          
          const bestFK = validFKs.length > 0 ? Math.min(...validFKs) : 0;
          const worstFK = validFKs.length > 0 ? Math.max(...validFKs) : 0;
          
          const bestPDDD = validPDDDs.length > 0 ? Math.min(...validPDDDs) : 0;
          const worstPDDD = validPDDDs.length > 0 ? Math.max(...validPDDDs) : 0;
          
          const bestFDFavok = validFDFavoks.length > 0 ? Math.min(...validFDFavoks) : 0;
          const worstFDFavok = validFDFavoks.length > 0 ? Math.max(...validFDFavoks) : 0;
          
          const bestOzsermaye = validOzsermaye.length > 0 ? Math.max(...validOzsermaye) : 0;
          const worstOzsermaye = validOzsermaye.length > 0 ? Math.min(...validOzsermaye) : 0;
          
          setBestRatios({fk: bestFK, pddd: bestPDDD, fdFavok: bestFDFavok});
          
          // Bu hissenin tüm rasyolarda en iyi olup olmadığını kontrol et
          const fk = parseFloat(String(bulunanHisse[headersMapObj.fk]));
          const pddd = parseFloat(String(bulunanHisse[headersMapObj.pddd]));
          const fdFavok = parseFloat(String(bulunanHisse[headersMapObj.fdFavok]));
          
          const isAllBestValue = (
            (bestFK > 0 && fk > 0 && Math.abs(fk - bestFK) < 0.01) &&
            (bestPDDD > 0 && pddd > 0 && Math.abs(pddd - bestPDDD) < 0.01) &&
            (bestFDFavok > 0 && fdFavok > 0 && Math.abs(fdFavok - bestFDFavok) < 0.01)
          );
          
          setIsAllBest(isAllBestValue);
          
          // Yeni puanlama sistemini uygula
          // Her bir skor için min, max değerleri kullanarak normalize et
          const newStockScores: { [kod: string]: { 
            final: number, 
            fk: number, 
            pddd: number, 
            fdFavok: number, 
            ozsermaye: number, 
            validCount: number 
          } } = {};
          
          sektorHisseleri.forEach(stock => {
            const kod = String(stock[headersMapObj.kod] || '');
            
            // Normalize puanlarını hesapla
            let fkScore = 0;
            let pdddScore = 0;
            let fdFavokScore = 0;
            let ozsermayeScore = 0;
            let validCount = 0;
            
            // FK puanı (düşük iyi) - 10 * ((max - current) / (max - min))
            const stockFK = parseFloat(String(stock[headersMapObj.fk]));
            if (!isNaN(stockFK) && stockFK > 0 && worstFK > bestFK) {
              fkScore = 10 * ((worstFK - stockFK) / (worstFK - bestFK));
              validCount++;
            } else if (!isNaN(stockFK) && stockFK > 0) {
              // Eğer min=max ise (tek değer varsa), eşit olduğu için tam puan ver
              fkScore = 10;
              validCount++;
            } else {
              // Değer yoksa veya negatifse
              fkScore = -2; // ceza puanı
            }
            
            // PD/DD puanı (düşük iyi) - 10 * ((max - current) / (max - min))
            const stockPDDD = parseFloat(String(stock[headersMapObj.pddd]));
            if (!isNaN(stockPDDD) && stockPDDD > 0 && worstPDDD > bestPDDD) {
              pdddScore = 10 * ((worstPDDD - stockPDDD) / (worstPDDD - bestPDDD));
              validCount++;
            } else if (!isNaN(stockPDDD) && stockPDDD > 0) {
              pdddScore = 10; 
              validCount++;
            } else {
              pdddScore = -2;
            }
            
            // FD/FAVÖK puanı (düşük iyi) - 10 * ((max - current) / (max - min))
            const stockFDFavok = parseFloat(String(stock[headersMapObj.fdFavok]));
            if (!isNaN(stockFDFavok) && stockFDFavok > 0 && stockFDFavok <= 100 && worstFDFavok > bestFDFavok) {
              fdFavokScore = 10 * ((worstFDFavok - stockFDFavok) / (worstFDFavok - bestFDFavok));
              validCount++;
            } else if (!isNaN(stockFDFavok) && stockFDFavok > 0 && stockFDFavok <= 100) {
              fdFavokScore = 10;
              validCount++;
            } else {
              fdFavokScore = -2;
            }
            
            // Özsermaye karlılığı puanı (yüksek iyi) - 10 * ((current - min) / (max - min))
            const stockOzsermaye = parseFloat(String(stock[headersMapObj.ozsermaye]));
            if (!isNaN(stockOzsermaye) && stockOzsermaye > 0 && bestOzsermaye > worstOzsermaye) {
              ozsermayeScore = 10 * ((stockOzsermaye - worstOzsermaye) / (bestOzsermaye - worstOzsermaye));
              validCount++;
            } else if (!isNaN(stockOzsermaye) && stockOzsermaye > 0) {
              ozsermayeScore = 10;
              validCount++;
            } else {
              ozsermayeScore = -2;
            }
            
            // Her puanı 0 ile 10 arasında sınırla
            fkScore = Math.max(0, Math.min(10, fkScore));
            pdddScore = Math.max(0, Math.min(10, pdddScore));
            fdFavokScore = Math.max(0, Math.min(10, fdFavokScore));
            ozsermayeScore = Math.max(0, Math.min(10, ozsermayeScore));
            
            // Final puanı hesapla - ortalama
            let finalScore = 0;
            if (validCount > 0) {
              finalScore = (fkScore + pdddScore + fdFavokScore + ozsermayeScore) / 4;
            }
            
            // Puanları kaydet
            newStockScores[kod] = {
              final: finalScore,
              fk: fkScore,
              pddd: pdddScore,
              fdFavok: fdFavokScore,
              ozsermaye: ozsermayeScore,
              validCount: validCount
            };
          });
          
          // Hisseleri final puanlarına göre sırala
          const newSortedSectorScores = Object.entries(newStockScores)
            .map(([kod, scores]) => ({ 
              kod, 
              ...scores
            }))
            .sort((a, b) => {
              // Geçerli rasyo sayısı 2'den az olanları sona at
              if (a.validCount >= 2 && b.validCount < 2) return -1;
              if (a.validCount < 2 && b.validCount >= 2) return 1;
              
              // Puanı olmayanları sona at
              if (a.final === 0 && b.final > 0) return 1;
              if (a.final > 0 && b.final === 0) return -1;
              
              // Yüksek puandan düşüğe doğru sırala
              return b.final - a.final;
            });
          
          // sortedSectorScores boş kontrolü
          if (!newSortedSectorScores || newSortedSectorScores.length === 0) {
            console.warn("sortedSectorScores boş, puan hesaplaması yapılamıyor");
            setLoading(false);
            setSectorScores({});
            setStockScore(0);
            setIsSectorLeader(false);
            return;
          }
          
          console.log("Line 424, sortedSectorScores:", newSortedSectorScores);
          
          // Önce local obje oluşturup, sonra state'e aktaracağız
          const newScores = newSortedSectorScores.reduce((acc, item) => {
            if (!item) return acc;
            
            acc[item.kod] = {
              kod: item.kod,
              score: item.final,
              validRatios: item.validCount,
              total: item.final
            };
            return acc;
          }, {} as { [kod: string]: { kod: string; score: number; validRatios: number; total: number | null } });
          
          // newScores boş kontrolü
          if (Object.keys(newScores).length === 0) {
            console.warn("newScores boş, puan hesaplaması yapılamıyor");
            setLoading(false);
            setSectorScores({});
            setStockScore(0);
            setIsSectorLeader(false);
            return;
          }
          
          console.log("Line 443, newScores:", newScores);
          
          // Mevcut hissenin puanını ve sektör liderliğini belirle
          const currentKod = String(bulunanHisse[headersMapObj.kod] ?? '');
          if (!currentKod) {
            console.warn("currentKod boş, hissede kod bilgisi bulunamadı");
            setError("Hissede kod bilgisi bulunamadı");
            setLoading(false);
            return;
          }
          
          console.log("Line 455, currentKod:", currentKod);
          console.log("Line 456, stockScores:", newStockScores);
          
          const thisStockScore = newStockScores[currentKod]?.final ?? 0;
          const thisStockValidRatios = newStockScores[currentKod]?.validCount ?? 0;
          
          // Lider mi kontrolü - değerlerin tanımlı olduğundan emin olalım
          let isLeader = false;
          if (newSortedSectorScores.length > 0) {
            const topStock = newSortedSectorScores[0];
            if (topStock && topStock.kod === currentKod && thisStockScore > 0 && thisStockValidRatios >= 2) {
              isLeader = true;
            }
          }
          
          // Önce state'leri güncelle, sonra sectorScores'u güncelle
          setStockScore(thisStockScore);
          setIsSectorLeader(isLeader);
          setSectorScores(newScores);
          
          console.log("setSectorScores sonrası - thisStockScore:", thisStockScore);
          console.log("setSectorScores sonrası - thisStockValidRatios:", thisStockValidRatios);
          console.log("setSectorScores sonrası - isLeader:", isLeader);
          
          // Sektör ortalamalarını hesapla
          const fkValues = sektorHisseleri
            .map(item => parseFloat(String(item[headersMapObj.fk])))
            .filter(val => !isNaN(val) && val > 0);
          
          const pdddValues = sektorHisseleri
            .map(item => parseFloat(String(item[headersMapObj.pddd])))
            .filter(val => !isNaN(val) && val > 0);
          
          const fdFavokValues = sektorHisseleri
            .map(item => parseFloat(String(item[headersMapObj.fdFavok])))
            .filter(val => !isNaN(val) && val > 0);
          
          const ozsermayeValues = sektorHisseleri
            .map(item => parseFloat(String(item[headersMapObj.ozsermaye])))
            .filter(val => !isNaN(val) && val > 0);
          
          const aciklikValues = sektorHisseleri
            .map(item => parseFloat(String(item[headersMapObj.aciklik])))
            .filter(val => !isNaN(val) && val > 0);
          
          const fkAvg = fkValues.length > 0 ? fkValues.reduce((sum, val) => sum + val, 0) / fkValues.length : 0;
          const pdddAvg = pdddValues.length > 0 ? pdddValues.reduce((sum, val) => sum + val, 0) / pdddValues.length : 0;
          const fdFavokAvg = fdFavokValues.length > 0 ? fdFavokValues.reduce((sum, val) => sum + val, 0) / fdFavokValues.length : 0;
          const ozsermayeAvg = ozsermayeValues.length > 0 ? ozsermayeValues.reduce((sum, val) => sum + val, 0) / ozsermayeValues.length : 0;
          const aciklikAvg = aciklikValues.length > 0 ? aciklikValues.reduce((sum, val) => sum + val, 0) / aciklikValues.length : 0;
          
          setSectorAverages({
            fk: fkAvg,
            pddd: pdddAvg,
            fdFavok: fdFavokAvg,
            ozsermaye: ozsermayeAvg,
            aciklik: aciklikAvg
          });
          
          console.log(`Sektör ortalamaları:`, 
            `FK: ${fkAvg.toFixed(2)}`,
            `PD/DD: ${pdddAvg.toFixed(2)}`,
            `FD/FAVÖK: ${fdFavokAvg.toFixed(2)}`,
            `Özsermaye Karlılığı: ${ozsermayeAvg.toFixed(2)}`,
            `Halka Açıklık: ${aciklikAvg.toFixed(2)}`
          );

          // Avantaj ve dezavantajları belirle
          const strengthsList: string[] = [];
          const weaknessesList: string[] = [];
          
          // Sermaye değerlendirmesi
          const sermayeDegeri = parseFloat(String(bulunanHisse[headersMapObj.sermaye]));
          if (!isNaN(sermayeDegeri)) {
            if (sermayeDegeri < 100) {
              strengthsList.push(`Düşük ödenmiş sermaye (${sermayeDegeri.toLocaleString('tr-TR')} milyon TL) mali esneklik sağlar`);
            } else if (sermayeDegeri < 500) {
              strengthsList.push(`Makul ödenmiş sermaye (${sermayeDegeri.toLocaleString('tr-TR')} milyon TL)`);
            } else if (sermayeDegeri > 5000) {
              weaknessesList.push(`Çok yüksek ödenmiş sermaye (${sermayeDegeri.toLocaleString('tr-TR')} milyon TL) özsermaye getirisini düşürebilir`);
            } else if (sermayeDegeri > 1000) {
              weaknessesList.push(`Yüksek ödenmiş sermaye (${sermayeDegeri.toLocaleString('tr-TR')} milyon TL)`);
            }
          }
          
          // Halka açıklık değerlendirmesi
          const aciklikOrani = parseFloat(String(bulunanHisse[headersMapObj.aciklik]));
          if (!isNaN(aciklikOrani)) {
            if (aciklikOrani > 70) {
              weaknessesList.push(`Yüksek halka açıklık oranı (%${aciklikOrani.toLocaleString('tr-TR')}) sahiplik yoğunluğunu azaltır`);
            } else if (aciklikOrani < 30) {
              strengthsList.push(`Düşük halka açıklık oranı (%${aciklikOrani.toLocaleString('tr-TR')}) yönetimde istikrar sağlar`);
            }
          }
          
          // FK değerlendirmesi
          const fkDegeri = parseFloat(String(bulunanHisse[headersMapObj.fk]));
          if (!isNaN(fkDegeri) && fkDegeri > 0) {
            if (bestFK > 0 && Math.abs(fkDegeri - bestFK) < 0.01) {
              strengthsList.push(`En düşük F/K oranına (${fkDegeri.toFixed(2)}) sahip, sektörde değerce en uygun hisse`);
            } else if (fkAvg > 0) {
              if (fkDegeri < fkAvg) {
                const farkYuzde = ((fkAvg - fkDegeri) / fkAvg * 100).toFixed(0);
                strengthsList.push(`F/K oranı (${fkDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) daha düşük`);
              } else {
                const farkYuzde = ((fkDegeri - fkAvg) / fkAvg * 100).toFixed(0);
                weaknessesList.push(`F/K oranı (${fkDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) daha yüksek`);
              }
            }
          } else {
            weaknessesList.push("F/K oranı hesaplanamıyor (negatif/sıfır kazanç)");
          }
          
          // PD/DD değerlendirmesi
          const pdddDegeri = parseFloat(String(bulunanHisse[headersMapObj.pddd]));
          if (!isNaN(pdddDegeri) && pdddDegeri > 0) {
            if (bestPDDD > 0 && Math.abs(pdddDegeri - bestPDDD) < 0.01) {
              strengthsList.push(`En düşük PD/DD oranına (${pdddDegeri.toFixed(2)}) sahip, sektörde defter değerine göre en uygun hisse`);
            } else if (pdddAvg > 0) {
              if (pdddDegeri < pdddAvg) {
                const farkYuzde = ((pdddAvg - pdddDegeri) / pdddAvg * 100).toFixed(0);
                strengthsList.push(`PD/DD oranı (${pdddDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) daha düşük`);
              } else {
                const farkYuzde = ((pdddDegeri - pdddAvg) / pdddAvg * 100).toFixed(0);
                weaknessesList.push(`PD/DD oranı (${pdddDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) daha yüksek`);
              }
            }
          } else {
            weaknessesList.push("PD/DD oranı hesaplanamıyor");
          }
          
          // FD/FAVÖK değerlendirmesi
          const fdFavokDegeri = parseFloat(String(bulunanHisse[headersMapObj.fdFavok]));
          if (!isNaN(fdFavokDegeri) && fdFavokDegeri > 0) {
            if (fdFavokDegeri > 100) {
              weaknessesList.push(`FD/FAVÖK oranı çok yüksek (${fdFavokDegeri.toFixed(2)}), operasyonel karlılık düşük`);
            } else if (bestFDFavok > 0 && Math.abs(fdFavokDegeri - bestFDFavok) < 0.01) {
              strengthsList.push(`En düşük FD/FAVÖK oranına (${fdFavokDegeri.toFixed(2)}) sahip, sektörde operasyonel değerce en uygun hisse`);
            } else if (fdFavokAvg > 0) {
              if (fdFavokDegeri < fdFavokAvg) {
                const farkYuzde = ((fdFavokAvg - fdFavokDegeri) / fdFavokAvg * 100).toFixed(0);
                strengthsList.push(`FD/FAVÖK oranı (${fdFavokDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) daha düşük`);
              } else {
                const farkYuzde = ((fdFavokDegeri - fdFavokAvg) / fdFavokAvg * 100).toFixed(0);
                weaknessesList.push(`FD/FAVÖK oranı (${fdFavokDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) daha yüksek`);
              }
            }
          } else {
            weaknessesList.push("FD/FAVÖK oranı hesaplanamıyor");
          }
          
          // Özsermaye Karlılığı değerlendirmesi
          const ozsermayeDegeri = parseFloat(String(bulunanHisse[headersMapObj.ozsermaye]));
          if (!isNaN(ozsermayeDegeri) && ozsermayeDegeri > 0) {
            if (ozsermayeAvg > 0) {
              if (ozsermayeDegeri > ozsermayeAvg * 1.5) {
                const farkYuzde = ((ozsermayeDegeri - ozsermayeAvg) / ozsermayeAvg * 100).toFixed(0);
                strengthsList.push(`Özsermaye karlılığı (%${ozsermayeDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) çok daha yüksek`);
              } else if (ozsermayeDegeri > ozsermayeAvg) {
                const farkYuzde = ((ozsermayeDegeri - ozsermayeAvg) / ozsermayeAvg * 100).toFixed(0);
                strengthsList.push(`Özsermaye karlılığı (%${ozsermayeDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) daha yüksek`);
              } else if (ozsermayeDegeri < ozsermayeAvg * 0.5) {
                const farkYuzde = ((ozsermayeAvg - ozsermayeDegeri) / ozsermayeAvg * 100).toFixed(0);
                weaknessesList.push(`Özsermaye karlılığı (%${ozsermayeDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) çok daha düşük`);
              } else {
                const farkYuzde = ((ozsermayeAvg - ozsermayeDegeri) / ozsermayeAvg * 100).toFixed(0);
                weaknessesList.push(`Özsermaye karlılığı (%${ozsermayeDegeri.toFixed(2)}), sektör ortalamasından (%${farkYuzde}) daha düşük`);
              }
            }
          } else {
            weaknessesList.push("Özsermaye karlılığı hesaplanamıyor veya negatif");
          }
          
          setStrengths(strengthsList);
          setWeaknesses(weaknessesList);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Veri yüklenirken hata oluştu:", err);
        // 528. satır civarında hata için debug logları ekle
        console.error("Hatanın oluştuğu yer - sectorScores:", sectorScores);
        console.error("Hatanın oluştuğu yer - sectorScores keys:", sectorScores ? Object.keys(sectorScores) : "sectorScores undefined");
        
        if (sectorScores) {
          Object.entries(sectorScores).forEach(([key, value]) => {
            console.log(`sectorScores[${key}]:`, value);
            console.log(`sectorScores[${key}].total:`, value?.total);
          });
        }
        
        setError("Excel dosyası yüklenirken bir hata oluştu. Lütfen dosyanın doğru formatta olduğundan emin olun.");
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  useEffect(() => {
    // Mevcut notu yükle
    if (slug) {
      setNoteText(getNote(slug));
    }
  }, [slug, getNote]);

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

  // Object.entries kullanımında genel güvenlik iyileştirmesi
  // Sektör puanları ve skor hesaplama
  useEffect(() => {
    if (!hisseVeri || !headersMap || !sektorVerileri || sektorVerileri.length === 0) return;
    
    // Güvenli erişim için
    try {
      // Mevcut hissenin puanını ve sektör liderliğini belirle
      const currentKod = String(hisseVeri[headersMap.kod] ?? '');
      if (!currentKod) {
        setError("Hissede kod bilgisi bulunamadı");
        setLoading(false);
        return;
      }
      
      // Eğer sectorScores boşsa veya tanımsızsa güvenli bir şekilde ilerle
      if (!sectorScores || Object.keys(sectorScores).length === 0) {
        console.warn("Sektör puanları hesaplanamadı");
        return;
      }
      
      const thisStockScore = sectorScores[currentKod]?.score ?? 0;
      const thisStockValidRatios = sectorScores[currentKod]?.validRatios ?? 0;
      
      // Object.entries güvenli kullanımı
      const scoresArray = Object.keys(sectorScores)
        .map(key => ({ 
          key, 
          score: sectorScores[key]?.score ?? 0,
          validRatios: sectorScores[key]?.validRatios ?? 0
        }))
        .filter(item => typeof item.score === 'number' && item.score > 0)
        .sort((a, b) => b.score - a.score);
      
      const isLeader = scoresArray.length > 0 && 
                      scoresArray[0].key === currentKod && 
                      thisStockScore > 0 && 
                      thisStockValidRatios >= 2;
      
      setIsSectorLeader(isLeader);
    } catch (error) {
      console.error("Sektör puanı hesaplanırken hata:", error);
    }
  }, [hisseVeri, headersMap, sektorVerileri, sectorScores, setError, setLoading, setIsSectorLeader]);

  // Sektör puanı hesaplama kısmındaki erişimleri güvenli hale getirdim
  const isBestInSector = (ratio: string): boolean => {
    if (!hisseVeri || !headersMap || !bestRatios) return false;
    
    const ratioKey = headersMap[ratio as keyof typeof headersMap];
    if (!ratioKey) return false;
    
    const value = parseFloat(String(hisseVeri[ratioKey] ?? ''));
    if (isNaN(value) || value <= 0) return false;
    
    const bestValue = bestRatios[ratio as keyof typeof bestRatios] ?? 0;
    
    return Math.abs(value - bestValue) < 0.01; // Küçük yuvarlama farklarını tolere et
  };

  // Halka açıklık oranı çok yüksekse kırmızı
  const isHighPublicFloat = (): boolean => {
    if (!hisseVeri || !headersMap) return false;
    
    const aciklikKey = headersMap.aciklik;
    if (!aciklikKey) return false;
    
    const value = parseFloat(String(hisseVeri[aciklikKey] ?? ''));
    return !isNaN(value) && value > 50; // Halka açıklık %50'den fazlaysa kırmızı
  };
  
  // FK sektör ortalamasından yüksekse kırmızı
  const isHighFK = (): boolean => {
    if (!hisseVeri || !headersMap || !sectorAverages) return false;
    
    const fkKey = headersMap.fk;
    if (!fkKey) return false;
    
    const value = parseFloat(String(hisseVeri[fkKey] ?? ''));
    const average = sectorAverages?.fk ?? 0;
    
    return !isNaN(value) && value > 0 && average > 0 && value > average;
  };
  
  // PD/DD sektör ortalamasından yüksekse kırmızı
  const isHighPDDD = (): boolean => {
    if (!hisseVeri || !headersMap || !sectorAverages) return false;
    
    const pdddKey = headersMap.pddd;
    if (!pdddKey) return false;
    
    const value = parseFloat(String(hisseVeri[pdddKey] ?? ''));
    const average = sectorAverages?.pddd ?? 0;
    
    return !isNaN(value) && value > 0 && average > 0 && value > average;
  };
  
  // FD/FAVÖK sektör ortalamasından yüksekse kırmızı
  const isHighFDFavok = (): boolean => {
    if (!hisseVeri || !headersMap || !sectorAverages) return false;
    
    const fdFavokKey = headersMap.fdFavok;
    if (!fdFavokKey) return false;
    
    const value = parseFloat(String(hisseVeri[fdFavokKey] ?? ''));
    const average = sectorAverages?.fdFavok ?? 0;
    
    return !isNaN(value) && value > 0 && average > 0 && value > average;
  };
  
  // Özsermaye karlılığı sektör ortalamasının %50 altındaysa kırmızı
  const isLowOzsermaye = (): boolean => {
    if (!hisseVeri || !headersMap || !sectorAverages) return false;
    
    const ozsermayeKey = headersMap.ozsermaye;
    if (!ozsermayeKey) return false;
    
    const value = parseFloat(String(hisseVeri[ozsermayeKey] ?? ''));
    const average = sectorAverages?.ozsermaye ?? 0;
    
    // Özsermaye karlılığı sektör ortalamasının %50 altındaysa kırmızı
    return !isNaN(value) && value > 0 && average > 0 && value < (average * 0.5);
  };

  // Not kaydetme fonksiyonu
  const handleSaveNote = () => {
    addNote(slug, noteText);
  };

  // Yükleme durumu 
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 animate-fade-in">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-t-primary-500 border-primary-200 rounded-full animate-spin"></div>
          <p className="mt-4 text-lg dark:text-gray-300">Hisse verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold">Hata!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!hisseVeri) {
    return (
      <div className="max-w-7xl mx-auto p-4 animate-fade-in">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold">Hisse bulunamadı!</h2>
          <p>"{slug}" kodlu hisse için veri bulunamadı.</p>
          <Link href="/" className="inline-block mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-700 dark:hover:bg-primary-600 rounded-md transition-colors duration-300">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  // Tema renkleri 
  const baseColors = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    blue: "text-blue-600 dark:text-blue-400",
    neutral: "text-gray-700 dark:text-gray-300"
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-16 animate-fade-in">
      {/* Üst bilgi alanı */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 animate-slide-up">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {hisseVeri ? hisseVeri[headersMap.hisse] : "Yükleniyor..."}
            </h1>
            <span className="px-3 py-1 text-lg font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300">
              {slug}
            </span>
            
            {isSectorLeader && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Sektör Lideri
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {hisseVeri ? hisseVeri[headersMap.sektör] : ""} Sektörü
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => isInWatchlist(slug) ? removeFromWatchlist(slug) : addToWatchlist(slug)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 ${
              isInWatchlist(slug)
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50'
            }`}
          >
            {isInWatchlist(slug) ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Listeden Çıkar
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Listeye Ekle
              </>
            )}
          </button>

          <Link 
            href={`/compare?stocks=${slug}`} 
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Karşılaştır
          </Link>
        </div>
      </div>

      {/* TradingView widget bileşeni */}
      {!loading && !error && hisseVeri && (
        <div className="mb-6">
          <TradingViewWidget symbol={`BIST:${slug.toUpperCase()}`} />
        </div>
      )}

      {/* Ana içerik Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol sütun */}
        <div className="lg:col-span-2 space-y-6">
          {/* Finansal özet kartı */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Finansal Özet</h2>
            </div>
            <div className="p-4">
              {hisseVeri && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Sol sütun */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Kapanış Fiyatı</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatValue(hisseVeri[headersMap.kapanis], true)} TL
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Piyasa Değeri</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatValue(hisseVeri[headersMap.piyasa], true)} milyon TL
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Ödenmiş Sermaye</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatValue(hisseVeri[headersMap.sermaye], true)} milyon TL
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Halka Açıklık</span>
                      <span className={`text-lg font-semibold ${isHighPublicFloat() ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                        %{formatValue(hisseVeri[headersMap.aciklik], true)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Sağ sütun */}
                  <div className="space-y-3">
                    <div>
                      <Tooltip text="Hisse fiyatının şirketin bir yıllık kazancına oranı. Düşük değerler daha iyidir.">
                        <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1 underline decoration-dotted cursor-help">F/K Oranı</span>
                      </Tooltip>
                      <span className={`text-lg font-semibold ${isBestInSector('fk') ? "text-green-600 dark:text-green-400" : isHighFK() ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                        {formatValue(hisseVeri[headersMap.fk], true)}
                      </span>
                      <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                        Sektör Ort: {formatValue(sectorAverages?.fk, true)}
                      </span>
                    </div>
                    
                    <div>
                      <Tooltip text="Piyasa değerinin defter değerine oranı. Düşük değerler daha iyidir.">
                        <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1 underline decoration-dotted cursor-help">PD/DD Oranı</span>
                      </Tooltip>
                      <span className={`text-lg font-semibold ${isBestInSector('pddd') ? "text-green-600 dark:text-green-400" : isHighPDDD() ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                        {formatValue(hisseVeri[headersMap.pddd], true)}
                      </span>
                      <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                        Sektör Ort: {formatValue(sectorAverages?.pddd, true)}
                      </span>
                    </div>
                    
                    <div>
                      <Tooltip text="Firma değerinin faiz, amortisman ve vergi öncesi kâra oranı. Düşük değerler daha iyidir.">
                        <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1 underline decoration-dotted cursor-help">FD/FAVÖK Oranı</span>
                      </Tooltip>
                      <span className={`text-lg font-semibold ${isBestInSector('fdFavok') ? "text-green-600 dark:text-green-400" : isHighFDFavok() ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                        {formatValue(hisseVeri[headersMap.fdFavok], true)}
                      </span>
                      <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                        Sektör Ort: {formatValue(sectorAverages?.fdFavok, true)}
                      </span>
                    </div>
                    
                    <div>
                      <Tooltip text="Şirketin net kârının özsermayeye oranı. Yüksek değerler daha iyidir.">
                        <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1 underline decoration-dotted cursor-help">Özsermaye Karlılığı</span>
                      </Tooltip>
                      <span className={`text-lg font-semibold ${isLowOzsermaye() ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        %{formatValue(hisseVeri[headersMap.ozsermaye], true)}
                      </span>
                      <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                        Sektör Ort: %{formatValue(sectorAverages?.ozsermaye, true)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Skor gösterimi */}
                  <div className="col-span-2 mt-2">
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Toplam Puan:</span>
                      <div className="text-xl font-bold flex items-center">
                        {stockScore > 0 ? (
                          <span className={`${stockScore >= 7 ? "text-green-600 dark:text-green-400" : stockScore >= 4 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                            {stockScore.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            Hesaplanamadı
                          </span>
                        )}
                        
                        {isSectorLeader && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Sektör Lideri
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Not alanı */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Notlarım</h2>
            </div>
            <div className="p-4">
              <textarea 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Bu hisse hakkında notlarınızı buraya yazabilirsiniz..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                rows={5}
              />
              <div className="mt-3 flex justify-end">
                <button 
                  onClick={() => addNote(slug, noteText)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-700 dark:hover:bg-primary-600 rounded-md transition-colors duration-300"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sağ sütun */}
        <div className="space-y-6">
          {/* Sektör karşılaştırma tablosu */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Sektör Karşılaştırması</h2>
            </div>
            <div className="p-4">
              {/* Sektör ortalamaları */}
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">Sektör Ortalamaları</h3>
                
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">F/K Oranı</div>
                    <div className="text-lg font-medium text-gray-800 dark:text-gray-200">{formatValue(sectorAverages?.fk, true)}</div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">PD/DD Oranı</div>
                    <div className="text-lg font-medium text-gray-800 dark:text-gray-200">{formatValue(sectorAverages?.pddd, true)}</div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">FD/FAVÖK Oranı</div>
                    <div className="text-lg font-medium text-gray-800 dark:text-gray-200">{formatValue(sectorAverages?.fdFavok, true)}</div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Özsermaye Karlılığı</div>
                    <div className="text-lg font-medium text-gray-800 dark:text-gray-200">%{formatValue(sectorAverages?.ozsermaye, true)}</div>
                  </div>
                </div>
              </div>
              
              {/* Sektör Puan Sıralaması */}
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">Sektör Puan Sıralaması</h3>
                
                {sectorScores && Object.keys(sectorScores).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kod</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Puan</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rasyolar</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(sectorScores)
                          .sort((a, b) => {
                            // total null değerlerini sona at
                            if (a[1].total === null && b[1].total !== null) return 1;
                            if (a[1].total !== null && b[1].total === null) return -1;
                            
                            // total değeri olanlarda büyükten küçüğe sırala
                            if (a[1].total !== null && b[1].total !== null) {
                              return b[1].total - a[1].total;
                            }
                            
                            return 0;
                          })
                          .map(([kod, item], index) => (
                            <tr key={kod} className={slug === kod ? "bg-green-50 dark:bg-green-900/20" : ""}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                <Link href={`/hisse/${kod}`} className="hover:underline">
                                  {kod}
                                </Link>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {item.total !== null ? (
                                  <span className={`font-medium ${
                                    item.total >= 7 ? "text-green-600 dark:text-green-400" : 
                                    item.total >= 4 ? "text-yellow-600 dark:text-yellow-400" : 
                                    "text-red-600 dark:text-red-400"
                                  }`}>
                                    {item.total.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                <Tooltip text={`Bu puan ${item.validRatios} geçerli rasyodan hesaplanmıştır.`}>
                                  <span className="text-gray-500 dark:text-gray-400 underline decoration-dotted cursor-help">
                                    {item.validRatios}/4
                                  </span>
                                </Tooltip>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                    Sektör puanları hesaplanamadı.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    TradingView: any;
  }
} 