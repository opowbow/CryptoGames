import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface CoinModalProps {
  symbol: string;
  history: { week_number: number, price: number }[];
  onClose: () => void;
}

export const CoinModal: React.FC<CoinModalProps> = ({ symbol, history, onClose }) => {
  const currentPrice = history.length > 0 ? history[history.length - 1].price : 0;
  const startPrice = history.length > 0 ? history[0].price : 0;
  const totalChange = ((currentPrice - startPrice) / startPrice) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{symbol}</h2>
              <div className={`text-sm font-medium ${totalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Total Return: {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}%
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="week_number" 
                stroke="#64748b" 
                label={{ value: 'Week', position: 'insideBottom', offset: -5 }} 
              />
              <YAxis 
                stroke="#64748b" 
                domain={['auto', 'auto']}
                tickFormatter={(val) => `€${val.toFixed(2)}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(val: number) => [`€${val.toFixed(2)}`, 'Price']}
                labelFormatter={(label) => `Week ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#22d3ee" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#22d3ee' }}
                activeDot={{ r: 6, fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};
