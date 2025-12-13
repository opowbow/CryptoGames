import { Student, WeeklySnapshot, AppState } from '../types';

export const api = {
  getAssets: async (): Promise<{ symbol: string, name: string, price: number }[]> => {
    const res = await fetch('/api/assets', { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  addAsset: async (symbol: string, name: string, price: number) => {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name, price }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getStudents: async (): Promise<Student[]> => {
    const res = await fetch('/api/students');
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  addStudent: async (name: string, color: string) => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  buyCrypto: async (studentId: number, symbol: string, amountInEuro: number) => {
    const res = await fetch('/api/investments/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, symbol, amountInEuro }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  sellCrypto: async (studentId: number, investmentId: number) => {
    const res = await fetch('/api/investments/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, investmentId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  depositBank: async (studentId: number, amount: number) => {
    const res = await fetch('/api/bank/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, amount }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  withdrawBank: async (studentId: number, amount: number) => {
    const res = await fetch('/api/bank/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, amount }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  advanceWeek: async () => {
    const res = await fetch('/api/admin/next-week', {
      method: 'POST',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  resetApp: async () => {
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getHistory: async (): Promise<WeeklySnapshot[]> => {
    const res = await fetch('/api/history', { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getMarketHistory: async (): Promise<{ symbol: string, week_number: number, price: number }[]> => {
    const res = await fetch('/api/market/history', { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getState: async (): Promise<AppState> => {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
