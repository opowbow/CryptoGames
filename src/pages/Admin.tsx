import React, { useState } from 'react';
import { api } from '../lib/api';
import { Plus, ArrowRight, Save, Trash2 } from 'lucide-react';

const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
];

interface AdminProps {
  onWeekUpdate?: (newWeek: number) => void;
}

export const Admin: React.FC<AdminProps> = ({ onWeekUpdate }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      await api.addStudent(name, color);
      setMessage(`Added student: ${name}`);
      setName('');
      setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    } catch (error) {
      setMessage('Error adding student');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAdvanceWeek = async () => {
    console.log("Advance Week clicked");
    // Removed confirm dialog to prevent blocking issues
    setLoading(true);
    try {
      console.log("Calling API...");
      const res = await api.advanceWeek();
      console.log("API Response:", res);
      alert(`Server says: Week advanced to ${res.new_week}`);
      setMessage(`Week advanced to ${res.new_week}!`);
      if (onWeekUpdate) onWeekUpdate(res.new_week);
    } catch (error) {
      console.error("Advance week error:", error);
      setMessage('Error advancing week');
      alert("Error advancing week: " + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-cyan-400" />
          Add New Student
        </h2>

        <form onSubmit={handleAddStudent} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Student Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="Enter name..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Profile Color</label>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Save Student
          </button>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <ArrowRight className="w-6 h-6 text-yellow-400" />
          Game Controls
        </h2>
        
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
          <p className="text-yellow-200 text-sm">
            Advancing the week will calculate 3% interest for all bank deposits and save a snapshot of everyone's portfolio value for the history charts.
          </p>
        </div>

        <button
          onClick={handleAdvanceWeek}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          Advance Week
        </button>

        <div className="mt-8 pt-8 border-t border-slate-800">
          <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </h3>
          <button
            onClick={async () => {
              console.log("Reset App clicked");
              // Removed confirm dialog
              setLoading(true);
              try {
                console.log("Calling Reset API...");
                await api.resetApp();
                console.log("Reset successful");
                alert("App reset successfully! Returning to Week 0.");
                setMessage("App reset successfully!");
                if (onWeekUpdate) onWeekUpdate(0);
              } catch (error) {
                console.error("Reset error:", error);
                setMessage("Error resetting app");
                alert("Error resetting app: " + error);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Reset App & Data
          </button>
        </div>
      </div>

      {message && (
        <div className="fixed bottom-8 right-8 bg-slate-800 border border-cyan-500 text-cyan-400 px-6 py-4 rounded-xl shadow-2xl animate-bounce">
          {message}
        </div>
      )}
    </div>
  );
};
