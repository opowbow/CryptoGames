import React, { useState, useMemo } from 'react';
import { Student, Investment } from '../types';
import { X, Wallet, TrendingUp, TrendingDown, Landmark, Bitcoin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import clsx from 'clsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StudentModalProps {
  student: Student;
  marketHistory: { symbol: string, week_number: number, price: number }[];
  onClose: () => void;
  onUpdate: () => void;
}

const CRYPTO_OPTIONS = [
  { symbol: 'BTC-EUR', name: 'Bitcoin' },
  { symbol: 'ETH-EUR', name: 'Ethereum' },
  { symbol: 'SOL-EUR', name: 'Solana' },
  { symbol: 'DOGE-EUR', name: 'Dogecoin' },
  { symbol: 'ADA-EUR', name: 'Cardano' },
  { symbol: 'XRP-EUR', name: 'XRP' },
];

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

export const StudentModal: React.FC<StudentModalProps> = ({ student, marketHistory, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'trade' | 'bank'>('portfolio');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [assets, setAssets] = useState<{ symbol: string, name: string, price: number }[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch assets on mount
  React.useEffect(() => {
    api.getAssets().then(data => {
        setAssets(data);
        if (data.length > 0 && !selectedSymbol) setSelectedSymbol(data[0].symbol);
    });
  }, []);

  // Calculate chart data for portfolio performance
  const chartData = useMemo(() => {
    if (!student.portfolio || student.portfolio.length === 0 || !marketHistory.length) return [];

    // Group investments by symbol to get total amount per symbol
    const holdings: Record<string, number> = {};
    student.portfolio.forEach(inv => {
      holdings[inv.symbol] = (holdings[inv.symbol] || 0) + inv.amount;
    });

    // Get unique weeks
    const weeks = [...new Set(marketHistory.map(m => m.week_number))].sort((a, b) => a - b);
    const currentWeek = weeks.length > 0 ? Math.max(...weeks) : 1;

    return weeks.map(week => {
      const entry: any = { week };
      Object.keys(holdings).forEach(symbol => {
        const priceEntry = marketHistory.find(m => m.symbol === symbol && m.week_number === week);
        if (priceEntry) {
          entry[symbol] = priceEntry.price * holdings[symbol];
        }
      });

      // Bank Holding (Projected backwards based on 3% interest)
      const weeksDiff = currentWeek - week;
      entry['Bank'] = student.bank_balance / Math.pow(1.03, weeksDiff);

      return entry;
    });
  }, [student.portfolio, marketHistory, student.bank_balance]);

  const handleTrade = async () => {
    setLoading(true);
    setError('');
    try {
      if (tradeType === 'buy') {
        await api.buyCrypto(student.id, selectedSymbol, parseFloat(amount));
      } else {
        // For sell, we need the investment ID. 
        // This UI is simplified; normally we'd select the specific lot.
        // Here we'll just find the first investment of this symbol for simplicity or change UI.
        // Actually, let's change the UI to sell specific investments in the portfolio tab.
      }
      onUpdate();
      setAmount('');
      setActiveTab('portfolio');
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBank = async (type: 'deposit' | 'withdraw') => {
    setLoading(true);
    setError('');
    try {
      if (type === 'deposit') {
        await api.depositBank(student.id, parseFloat(amount));
      } else {
        await api.withdrawBank(student.id, parseFloat(amount));
      }
      onUpdate();
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSellInvestment = async (inv: Investment) => {
      // Removed confirm dialog for smoother UX
      setLoading(true);
      try {
          await api.sellCrypto(student.id, inv.id);
          onUpdate();
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg"
              style={{ backgroundColor: student.color, color: '#fff' }}
            >
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{student.name}</h2>
              <div className="flex gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Wallet className="w-4 h-4" /> Cash: €{student.cash_balance.toFixed(2)}</span>
                <span className="flex items-center gap-1"><Landmark className="w-4 h-4" /> Bank: €{student.bank_balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {['portfolio', 'trade', 'bank'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={clsx(
                "flex-1 py-4 text-sm font-medium transition-colors capitalize",
                activeTab === tab 
                  ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* Chart */}
              {chartData.length > 0 && (
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Investment Performance (Current Holdings)
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="week" stroke="#64748b" label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
                        <YAxis stroke="#64748b" tickFormatter={(val) => `€${val}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                          itemStyle={{ color: '#f8fafc' }}
                          formatter={(val: number) => [`€${val.toFixed(2)}`, '']}
                        />
                        <Legend />
                        {Object.keys(chartData[0] || {}).filter(k => k !== 'week').map((symbol, i) => (
                          <Line 
                            key={symbol}
                            type="monotone" 
                            dataKey={symbol} 
                            stroke={symbol === 'Bank' ? '#10b981' : COLORS[i % COLORS.length]} 
                            strokeWidth={symbol === 'Bank' ? 3 : 2}
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <h3 className="text-lg font-semibold text-white mb-4">Current Holdings</h3>
              {student.portfolio && student.portfolio.length > 0 ? (
                <div className="grid gap-3">
                  {student.portfolio.map((inv) => {
                    const isProfit = (inv.value || 0) >= inv.cost_basis;
                    return (
                      <div key={inv.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-700 rounded-lg">
                            <Bitcoin className="w-5 h-5 text-yellow-500" />
                          </div>
                          <div>
                            <div className="font-bold text-white">{inv.symbol}</div>
                            <div className="text-xs text-slate-400">{inv.amount.toFixed(6)} units</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-white">€{(inv.value || 0).toFixed(2)}</div>
                          <div className={clsx("text-xs font-medium", isProfit ? "text-green-400" : "text-red-400")}>
                            {isProfit ? '+' : ''}€{((inv.value || 0) - inv.cost_basis).toFixed(2)}
                          </div>
                        </div>
                        <button 
                            onClick={() => handleSellInvestment(inv)}
                            disabled={loading}
                            className="ml-4 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/20 transition-colors disabled:opacity-50"
                        >
                            {loading ? '...' : 'Sell'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No investments yet. Go to Trade tab to start!
                </div>
              )}
            </div>
          )}

          {activeTab === 'trade' && (
            <div className="space-y-6">
              <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">
                <button 
                  onClick={() => setTradeType('buy')}
                  className={clsx("flex-1 py-2 rounded-md text-sm font-medium transition-all", tradeType === 'buy' ? "bg-green-500 text-white shadow-lg" : "text-slate-400 hover:text-white")}
                >
                  Buy Crypto
                </button>
                {/* Sell is handled in portfolio for specific lots, but we could add generic sell here if we aggregated. Keeping it simple. */}
              </div>

              {tradeType === 'buy' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Select Asset</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {assets.map(opt => (
                        <button
                          key={opt.symbol}
                          onClick={() => setSelectedSymbol(opt.symbol)}
                          className={clsx(
                            "p-3 rounded-xl border text-left transition-all",
                            selectedSymbol === opt.symbol
                              ? "border-cyan-500 bg-cyan-500/10 text-white"
                              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          <div className="font-bold text-sm">{opt.symbol}</div>
                          <div className="text-xs opacity-70">{opt.name}</div>
                          <div className="text-xs text-cyan-400 mt-1">€{opt.price.toFixed(2)}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Amount (EUR)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-500 text-right">
                      Available: €{student.cash_balance.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={handleTrade}
                    disabled={loading || !amount}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Confirm Purchase'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                <h4 className="text-blue-400 font-bold flex items-center gap-2 mb-2">
                  <Landmark className="w-5 h-5" />
                  App Bank
                </h4>
                <p className="text-sm text-blue-200/80">
                  Earn 3% interest per week on your deposits. Safe and steady growth!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-xs mb-1">Cash Balance</div>
                  <div className="text-xl font-bold text-white">€{student.cash_balance.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-xs mb-1">Bank Balance</div>
                  <div className="text-xl font-bold text-white">€{student.bank_balance.toFixed(2)}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleBank('deposit')}
                  disabled={loading || !amount}
                  className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Deposit
                </button>
                <button
                  onClick={() => handleBank('withdraw')}
                  disabled={loading || !amount}
                  className="py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Withdraw
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
