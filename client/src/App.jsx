import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Moon, BarChart3, Settings, PlusCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import DreamEditor from './pages/DreamEditor';
import DreamDetail from './pages/DreamDetail';
import Analysis from './pages/Analysis';
import SettingsPage from './pages/Settings';

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-purple-400">
            <Moon className="w-5 h-5" /> DreamVault
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dream/new" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
              <PlusCircle className="w-4 h-4" /> 记录梦境
            </Link>
            <Link to="/analysis" className={`text-sm ${location.pathname === '/analysis' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
              <BarChart3 className="w-4 h-4" />
            </Link>
            <Link to="/settings" className={`text-sm ${location.pathname === '/settings' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dream/new" element={<DreamEditor />} />
          <Route path="/dream/:id" element={<DreamDetail />} />
          <Route path="/dream/:id/edit" element={<DreamEditor />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}