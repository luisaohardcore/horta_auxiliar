// src/App.jsx
import React, { useState, useEffect } from 'react';
import {
  Droplets, LayoutDashboard, Bell, History, Leaf, Menu, X,
} from 'lucide-react';
import PrincipalPage   from './features/principal/components/PrincipalPage.jsx';
import AlertasPage     from './features/alertas/components/AlertasPage.jsx';
import HistoricoPage   from './features/historico/components/HistoricoPage.jsx';
import CanteirosPage   from './features/canteiros/components/CanteirosPage.jsx';
import { countUnreadAlertas } from './features/alertas/services/alertasService.js';
import { logger } from './shared/utils/logger.js';

const TABS = [
  { id: 'principal',  label: 'Principal',   icon: LayoutDashboard, component: PrincipalPage },
  { id: 'alertas',    label: 'Alertas',      icon: Bell,            component: AlertasPage  },
  { id: 'historico',  label: 'Histórico',    icon: History,         component: HistoricoPage },
  { id: 'canteiros',  label: 'Canteiros',    icon: Leaf,            component: CanteirosPage },
];

export default function App() {
  const [tab, setTab]               = useState('principal');
  const [sidebarOpen, setSidebar]   = useState(false);
  const [unreadCount, setUnread]    = useState(0);

  useEffect(() => {
    countUnreadAlertas().then(setUnread).catch(() => {});
    logger.info('App', 'app_started');
  }, []);

  const ActivePage = TABS.find(t => t.id === tab)?.component ?? PrincipalPage;
  const pageTitle  = TABS.find(t => t.id === tab)?.label ?? 'Principal';
  const pageSub = {
    principal:  'Leituras e gráficos em tempo real.',
    alertas:    'Notificações e eventos do sistema.',
    historico:  'Registros históricos das leituras.',
    canteiros:  'Gestão dos canteiros da horta.',
  }[tab];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans relative transition-colors duration-300">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-emerald-900 text-emerald-50 flex flex-col flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="p-6 border-b border-emerald-800 flex justify-between items-center">
          <div className="flex items-center gap-3 font-bold text-xl">
            <Droplets className="text-emerald-400" />
            HortaSmart
          </div>
          <button className="md:hidden p-1 hover:bg-emerald-800 rounded"
            onClick={() => setSidebar(false)}>
            <X className="w-6 h-6 text-emerald-400" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button"
              onClick={() => { setTab(id); setSidebar(false); }}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left font-medium transition-all relative ${
                tab === id
                  ? 'bg-emerald-800 text-white border-r-4 border-emerald-400'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
              {id === 'alertas' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-800 text-xs text-emerald-400/60">
          v0.2.0-dashboard-rc
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col w-full max-w-full overflow-hidden">

        {/* Mobile header */}
        <header className="md:hidden bg-emerald-900 text-white p-4 flex items-center justify-between">
          <button className="p-1 -ml-1 hover:bg-emerald-800 rounded"
            onClick={() => setSidebar(true)}>
            <Menu className="w-6 h-6 text-emerald-400" />
          </button>
          <div className="flex items-center gap-2 font-bold">
            <Droplets className="w-5 h-5 text-emerald-400" /> HortaSmart
          </div>
          <div className="w-8" />
        </header>

        {/* Page */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <header className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{pageSub}</p>
            </header>
            <ActivePage />
          </div>
        </div>
      </main>
    </div>
  );
}
