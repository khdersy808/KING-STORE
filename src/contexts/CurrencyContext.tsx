import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { db, doc, getDoc } from '../lib/firebase';
import { useLanguage } from './LanguageContext';

export type Currency = 'USD' | 'SYP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  isSypEnabled: boolean;
  setIsSypEnabled: (enabled: boolean) => void;
  exchangeRate: number;
  formatPrice: (priceUSD: number) => string;
  formatPriceRaw: (priceUSD: number) => { value: string; symbol: string };
  convertPrice: (priceUSD: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('kingstore_currency');
    return (saved as Currency) || 'USD';
  });
  const [exchangeRate, setExchangeRate] = useState<number>(15000);

  // Sync exchange rate setting from Firestore - Changed to one-time fetch for stability
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const docRef = doc(db, 'settings', 'currency');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.exchangeRate === 'number') {
            setExchangeRate(data.exchangeRate);
          }
        }
      } catch (e) {
        console.warn("Error fetching exchange rate in CurrencyContext:", e);
      }
    };
    fetchExchangeRate();
  }, []);

  const setCurrency = useCallback((curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('kingstore_currency', curr);
  }, []);

  const isSypEnabled = currency === 'SYP';
  
  const setIsSypEnabled = useCallback((enabled: boolean) => {
    setCurrency(enabled ? 'SYP' : 'USD');
  }, [setCurrency]);

  const convertPrice = useCallback((priceUSD: number) => {
    if (currency === 'SYP') {
      return priceUSD * exchangeRate;
    }
    return priceUSD;
  }, [currency, exchangeRate]);

  const formatPrice = useCallback((priceUSD: number) => {
    const converted = convertPrice(priceUSD);
    const symbol = currency === 'SYP' ? (language === 'ar' ? 'ل.س' : 'SYP') : '$';
    
    if (currency === 'SYP') {
      return `${converted.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
    } else {
      return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }, [convertPrice, currency, language]);

  const formatPriceRaw = useCallback((priceUSD: number) => {
    const converted = convertPrice(priceUSD);
    const symbol = currency === 'SYP' ? (language === 'ar' ? 'ل.س' : 'SYP') : '$';
    const value = currency === 'SYP' 
      ? converted.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { value, symbol };
  }, [convertPrice, currency, language]);

  const value = useMemo(() => ({
    currency,
    setCurrency,
    isSypEnabled,
    setIsSypEnabled,
    exchangeRate,
    formatPrice,
    formatPriceRaw,
    convertPrice
  }), [currency, setCurrency, isSypEnabled, setIsSypEnabled, exchangeRate, formatPrice, formatPriceRaw, convertPrice]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
