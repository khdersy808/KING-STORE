import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, doc, onSnapshot } from '../lib/firebase';
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

  // Sync exchange rate setting from Firestore in real-time
  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', 'currency');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.exchangeRate === 'number') {
            setExchangeRate(data.exchangeRate);
          }
        }
      }, (error) => {
        console.warn("Error listening to exchange rate in CurrencyContext:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase exchange rate sync not fully active in CurrencyContext.", e);
    }
  }, []);

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('kingstore_currency', curr);
  };

  const isSypEnabled = currency === 'SYP';
  const setIsSypEnabled = (enabled: boolean) => {
    setCurrency(enabled ? 'SYP' : 'USD');
  };

  const convertPrice = (priceUSD: number) => {
    if (isSypEnabled) {
      return priceUSD * exchangeRate;
    }
    return priceUSD;
  };

  const formatPrice = (priceUSD: number) => {
    const converted = convertPrice(priceUSD);
    const symbol = isSypEnabled ? (language === 'ar' ? 'ل.س' : 'SYP') : '$';
    
    if (isSypEnabled) {
      return `${converted.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
    } else {
      return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatPriceRaw = (priceUSD: number) => {
    const converted = convertPrice(priceUSD);
    const symbol = isSypEnabled ? (language === 'ar' ? 'ل.س' : 'SYP') : '$';
    const value = isSypEnabled 
      ? converted.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { value, symbol };
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      isSypEnabled,
      setIsSypEnabled,
      exchangeRate,
      formatPrice,
      formatPriceRaw,
      convertPrice
    }}>
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
