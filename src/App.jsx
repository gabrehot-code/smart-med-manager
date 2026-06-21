import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';
import Auth from './screens/Auth';
import Dashboard from './screens/Dashboard';
import Inventory from './screens/Inventory';
import AddMedication from './screens/AddMedication';
import Settings from './screens/Settings';
import Family from './screens/Family';
import Vitals from './screens/Vitals';
import Journal from './screens/Journal';
import Emergency from './screens/Emergency';
import AIAssistant from './screens/AIAssistant';
import History from './screens/History';
import Profile from './screens/Profile';
import Placeholder from './screens/Placeholder';

export default function App() {
  const { session, loading } = useAuth();
  const [screen, setScreen] = useState('dashboard');

  if (loading) {
    return (
      <div className="app-shell items-center justify-center">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin" aria-hidden="true">progress_activity</span>
      </div>
    );
  }

  if (!session) {
    return <div className="app-shell"><Auth /></div>;
  }

  const navTabs = ['dashboard', 'inventory', 'family', 'settings'];
  const showNav = navTabs.includes(screen);

  let view;
  switch (screen) {
    case 'dashboard': view = <Dashboard go={setScreen} />; break;
    case 'inventory': view = <Inventory go={setScreen} />; break;
    case 'add': view = <AddMedication go={setScreen} />; break;
    case 'settings': view = <Settings go={setScreen} />; break;
    case 'family': view = <Family go={setScreen} />; break;
    case 'vitals': view = <Vitals go={setScreen} />; break;
    case 'journal': view = <Journal go={setScreen} />; break;
    case 'emergency': view = <Emergency go={setScreen} />; break;
    case 'ai': view = <AIAssistant go={setScreen} />; break;
    case 'history': view = <History go={setScreen} />; break;
    case 'profile': view = <Profile go={setScreen} />; break;
    default: view = <Placeholder title="בקרוב" go={setScreen} />;
  }

  return (
    <div className="app-shell">
      <div className="flex-1 overflow-y-auto">{view}</div>
      {showNav && <BottomNav active={screen} onNavigate={setScreen} />}
    </div>
  );
}
