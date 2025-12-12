import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { api } from './lib/api';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin'>('dashboard');
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const state = await api.getState();
        setCurrentWeek(state.current_week);
      } catch (e) {
        console.error("Failed to fetch state", e);
      }
    };
    fetchState();
    // Poll for week changes every 30s
    const interval = setInterval(fetchState, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout 
      currentView={currentView} 
      onNavigate={setCurrentView}
      currentWeek={currentWeek}
    >
      {currentView === 'dashboard' ? (
        <Dashboard key={currentWeek} />
      ) : (
        <Admin onWeekUpdate={(newWeek) => {
          setCurrentWeek(newWeek);
        }} />
      )}
    </Layout>
  );
}

export default App;
