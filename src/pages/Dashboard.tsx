import React, { useEffect, useState } from 'react';
import { Student, WeeklySnapshot } from '../types';
import { api } from '../lib/api';
import { StudentModal } from '../components/StudentModal';
import { CoinModal } from '../components/CoinModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingUp, Wallet, Star, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

export const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<WeeklySnapshot[]>([]);
  const [marketHistory, setMarketHistory] = useState<{ symbol: string, week_number: number, price: number }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsData, historyData, marketData] = await Promise.all([
        api.getStudents(),
        api.getHistory(),
        api.getMarketHistory()
      ]);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setMarketHistory(Array.isArray(marketData) ? marketData : []);
    } catch (error) {
      console.error("Failed to fetch data", error);
      setStudents([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s for live prices
    return () => clearInterval(interval);
  }, []);

  // Process data for chart
  const chartData = React.useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return [];
    
    return history.reduce((acc: any[], curr) => {
      let weekEntry = acc.find(e => e.week === curr.week_number);
      if (!weekEntry) {
        weekEntry = { week: curr.week_number };
        acc.push(weekEntry);
      }
      weekEntry[`student_${curr.student_id}`] = curr.total_value;
      return acc;
    }, []).sort((a, b) => a.week - b.week);
  }, [history]);

  // Top Student
  const topStudent = students.length > 0 ? students[0] : null;

  // Top Investment
  let topInvestment = { symbol: 'N/A', gain: 0, studentName: '' };
  students.forEach(s => {
    s.portfolio?.forEach(inv => {
        if (inv.cost_basis > 0) {
            const gain = ((inv.value || 0) - inv.cost_basis) / inv.cost_basis * 100;
            if (gain > topInvestment.gain) {
                topInvestment = { symbol: inv.symbol, gain, studentName: s.name };
            }
        }
    });
  });

  // Market Watch Data Processing
  const marketWatchData = React.useMemo(() => {
      const symbols = [...new Set(marketHistory.map(m => m.symbol))];
      return symbols.map(sym => {
          const coinHistory = marketHistory.filter(m => m.symbol === sym).sort((a, b) => a.week_number - b.week_number);
          const current = coinHistory[coinHistory.length - 1];
          const previous = coinHistory.length > 1 ? coinHistory[coinHistory.length - 2] : null;
          
          let change = 0;
          if (current && previous) {
              change = ((current.price - previous.price) / previous.price) * 100;
          }

          return {
              symbol: sym,
              price: current?.price || 0,
              change,
              history: coinHistory
          };
      });
  }, [marketHistory]);

  if (loading && students.length === 0) {
    return <div className="flex items-center justify-center h-64 text-cyan-400">Loading Championship Data...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          Refresh Data
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Trophy className="w-24 h-24 text-yellow-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <Trophy className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Current Leader</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{topStudent?.name || 'No Data'}</div>
            <div className="text-yellow-400 font-mono">€{topStudent?.totalValue?.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <TrendingUp className="w-24 h-24 text-green-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <Star className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Top Investment</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{topInvestment.symbol}</div>
            <div className="text-green-400 font-mono">+{topInvestment.gain.toFixed(1)}% ({topInvestment.studentName})</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Wallet className="w-24 h-24 text-blue-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Wallet className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Total Market Cap</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              €{students.reduce((acc, s) => acc + (s.totalValue || 0), 0).toFixed(0)}
            </div>
            <div className="text-blue-400 text-sm">Active Players: {students.length}</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cyan-400" />
              Live Standings
            </h2>
            <div className="space-y-3">
              {students.map((student, index) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="group flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all"
                >
                  <div className={clsx(
                    "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm",
                    index === 0 ? "bg-yellow-500 text-black" :
                    index === 1 ? "bg-slate-400 text-black" :
                    index === 2 ? "bg-orange-700 text-white" :
                    "bg-slate-700 text-slate-400"
                  )}>
                    {index + 1}
                  </div>
                  
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg"
                    style={{ backgroundColor: student.color }}
                  >
                    {student.name.charAt(0)}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">{student.name}</div>
                    <div className="text-xs text-slate-400 flex gap-2">
                      <span>Cash: €{student.cash_balance.toFixed(0)}</span>
                      <span>•</span>
                      <span>Bank: €{student.bank_balance.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-white text-lg">€{student.totalValue?.toFixed(2)}</div>
                    <div className={clsx(
                      "text-xs font-medium",
                      (student.profitLoss || 0) >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {(student.profitLoss || 0) >= 0 ? '+' : ''}€{(student.profitLoss || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Performance History
            </h2>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="week" stroke="#64748b" label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend />
                    {students.map((student, i) => (
                      <Line 
                        key={student.id}
                        type="monotone" 
                        dataKey={`student_${student.id}`} 
                        name={student.name}
                        stroke={student.color} 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  No history data yet. Advance a week to see charts!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar / Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Market Watch</h3>
            <div className="space-y-3">
               {marketWatchData.map(coin => (
                 <div 
                    key={coin.symbol} 
                    onClick={() => setSelectedCoin(coin.symbol)}
                    className="flex justify-between items-center p-3 bg-slate-800/30 hover:bg-slate-800 rounded-lg border border-slate-700/30 cursor-pointer transition-colors"
                 >
                   <div>
                       <div className="font-bold text-slate-300">{coin.symbol}</div>
                       <div className="text-xs text-slate-500">€{coin.price.toFixed(2)}</div>
                   </div>
                   <div className={clsx("text-sm font-bold", coin.change >= 0 ? "text-green-400" : "text-red-400")}>
                       {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                   </div>
                 </div>
               ))}
               {marketWatchData.length === 0 && (
                   <div className="text-slate-500 text-sm text-center">No market data available.</div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedStudent && (
        <StudentModal 
          student={selectedStudent} 
          marketHistory={marketHistory}
          onClose={() => setSelectedStudent(null)} 
          onUpdate={() => {
            fetchData();
            api.getStudents().then(newData => {
                setStudents(newData);
                const updated = newData.find(s => s.id === selectedStudent.id);
                if (updated) setSelectedStudent(updated);
            });
          }}
        />
      )}

      {selectedCoin && (
          <CoinModal 
            symbol={selectedCoin}
            history={marketWatchData.find(m => m.symbol === selectedCoin)?.history || []}
            onClose={() => setSelectedCoin(null)}
          />
      )}
    </div>
  );
};
