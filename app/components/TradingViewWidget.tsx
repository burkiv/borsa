"use client";

import { useEffect } from "react";

export default function TradingViewWidget({ symbol }: { symbol: string }) {
  useEffect(() => {
    const container = document.getElementById("tradingview-widget");
    if (!container) {
      console.warn("TradingView container bulunamadı");
      return;
    }

    if (typeof window !== "undefined" && window.TradingView) {
      // TradingView script zaten yüklüyse
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Europe/Istanbul",
        theme: "dark",
        style: "1",
        locale: "tr",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingview-widget",
      });
    } else {
      // Script henüz yok, yüklüyoruz
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        if (window.TradingView) {
          new window.TradingView.widget({
            autosize: true,
            symbol,
            interval: "D",
            timezone: "Europe/Istanbul",
            theme: "dark",
            style: "1",
            locale: "tr",
            toolbar_bg: "#f1f3f6",
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: "tradingview-widget",
          });
        }
      };
      document.body.appendChild(script);
    }
  }, [symbol]);

  return (
    <div id="tradingview-widget" style={{ width: "100%", height: "500px" }} />
  );
}

declare global {
  interface Window {
    TradingView: any;
  }
} 