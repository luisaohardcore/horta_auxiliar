// src/features/alertas/components/AlertasPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle, Bell, BellOff, CheckCircle, Info,
  Filter, Loader2, RefreshCw, Terminal, ChevronDown, ChevronUp,
} from 'lucide-react';
import { fetchAlertas, markAlertaLido } from '../services/alertasService.js';
import { useCanteiros } from '../../../shared/hooks/useCanteiros.js';
import { TIPOS_ALERTA, SEVERIDADES } from '../mocks/alertas.mock.js';
import { logger, getLogs, metrics } from '../../../shared/utils/logger.js';
import ErrorBlock from '../../../shared/components/ErrorBlock.jsx';

// ── Helpers ────────────────────────────────────────────────────────

const SEV_STYLES = {
  critico: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',
  aviso:   'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900',
  info:    'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800',
};
const SEV_BADGE = {
  critico: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  aviso:   'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  info:    'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};
const SEV_ICON = {
  critico: <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  aviso:   <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
  info:    <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />,
};
const TIPO_LABELS = {
  umidade_critica:     'Umidade crítica',
  temperatura_alta:    'Temperatura alta',
  sensor_offline:      'Sensor offline',
  dado_parcial:        'Dado parcial',
  irrigacao_manual:    'Irrigação manual',
  irrigacao_concluida: 'Irrigação concluída',
  ph_anomalo:          'pH anômalo',
};
const LOG_CLR = {
  ERROR: 'text-red-400',
  WARN:  'text-amber-400',
  INFO:  'text-emerald-400',
  DEBUG: 'text-slate-500',
};

function fmt(ts) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function fmtLog(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Component ─────────────────────────────────────────────────────

export default function AlertasPage() {
  const { canteiros } = useCanteiros();
  const [alertas, setAlertas]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [logs, setLogs]         = useState([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL');
  const logsRef                 = useRef(null);

  const [filterCanteiro, setCanteiro] = useState('todos');
  const [filterTipo, setTipo]         = useState('todos');
  const [filterSev, setSev]           = useState('todos');
  const [filterPeriod, setPeriod]     = useState(7);

  const load = useCallback(async (p = 0, showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetchAlertas({
        canteiroId: filterCanteiro, tipo: filterTipo,
        severidade: filterSev, period: filterPeriod,
        page: p, limit: 20,
      });
      setAlertas(prev => p === 0 ? res.items : [...prev, ...res.items]);
      setTotal(res.total);
      setPage(p);
      metrics.recordAlertDisplayed(res.items.length);
      logger.info('AlertasPage', 'loaded', { total: res.total, page: p });
    } catch (err) {
      setError(err);
      logger.error('AlertasPage', 'load_error', { message: err.message, code: err.code });
    } finally {
      setLoading(false);
    }
  }, [filterCanteiro, filterTipo, filterSev, filterPeriod]);

  useEffect(() => { load(0); }, [load]);

  // Refresh logs whenever panel opens or after load
  useEffect(() => {
    setLogs(getLogs());
  }, [loading, logsOpen]);

  // Auto-scroll logs panel to top when opened
  useEffect(() => {
    if (logsOpen && logsRef.current) logsRef.current.scrollTop = 0;
  }, [logsOpen]);

  const handleMarkRead = async (id) => {
    await markAlertaLido(id);
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a));
  };

  const unread  = alertas.filter(a => !a.lido).length;
  const hasMore = alertas.length < total;

  const visibleLogs = logFilter === 'ALL'
    ? logs
    : logs.filter(l => l.level === logFilter);

  if (loading && alertas.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      <p className="font-medium">Carregando alertas…</p>
    </div>
  );

  if (error && alertas.length === 0) return <ErrorBlock error={error} onRetry={() => load(0)} />;

  return (
    <div className="space-y-5" data-testid="alertas-page">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {total} alerta{total !== 1 ? 's' : ''}
          </span>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unread} não lido{unread !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={() => load(0)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Canteiro', value: filterCanteiro, set: setCanteiro,
              options: [['todos','Todos'], ...canteiros.map(c => [c.id, c.nome.split('–')[0].trim()])] },
            { label: 'Tipo', value: filterTipo, set: setTipo,
              options: [['todos','Todos'], ...TIPOS_ALERTA.map(t => [t, TIPO_LABELS[t] ?? t])] },
            { label: 'Severidade', value: filterSev, set: setSev,
              options: [['todos','Todas'], ...SEVERIDADES.map(s => [s, s.charAt(0).toUpperCase() + s.slice(1)])] },
            { label: 'Período', value: filterPeriod, set: v => setPeriod(Number(v)),
              options: [['1','Último dia'], ['3','Últimos 3 dias'], ['7','Última semana']] },
          ].map(({ label, value, set, options }) => (
            <div key={label}>
              <label className="text-xs text-slate-500 block mb-1">{label}</label>
              <select value={value} onChange={e => set(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Alert list */}
      {alertas.length === 0 ? (
        <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-3">
          <BellOff className="w-12 h-12" />
          <p className="font-medium">Nenhum alerta para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertas.map(a => (
            <div key={a.id}
              className={`border rounded-xl px-4 py-3 flex items-start gap-3 transition-opacity ${SEV_STYLES[a.severidade]} ${a.lido ? 'opacity-55' : ''}`}>
              {SEV_ICON[a.severidade]}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_BADGE[a.severidade]}`}>
                    {a.severidade}
                  </span>
                  <span className="text-xs text-slate-500">{TIPO_LABELS[a.tipo] ?? a.tipo}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">{a.canteiro_id.replace('canteiro-', 'Canteiro ').toUpperCase()}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{fmt(a.timestamp)}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{a.mensagem}</p>
              </div>
              {!a.lido && (
                <button onClick={() => handleMarkRead(a.id)} title="Marcar como lido"
                  className="flex-shrink-0 mt-0.5 p-1 hover:bg-white/60 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </button>
              )}
            </div>
          ))}

          {hasMore && (
            <button onClick={() => load(page + 1, false)} disabled={loading}
              className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Carregar mais ({total - alertas.length} restantes)
            </button>
          )}
        </div>
      )}

      {/* System logs panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setLogsOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Logs do Sistema</span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
              {logs.length} entradas
            </span>
          </div>
          {logsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {logsOpen && (
          <div className="border-t border-slate-100 dark:border-slate-800">
            {/* Log level filter */}
            <div className="flex gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              {['ALL','ERROR','WARN','INFO','DEBUG'].map(l => (
                <button key={l} onClick={() => setLogFilter(l)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    logFilter === l
                      ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}>
                  {l}
                </button>
              ))}
              <button onClick={() => setLogs(getLogs())}
                className="ml-auto p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Log entries */}
            <div ref={logsRef} className="h-72 overflow-y-auto font-mono text-xs bg-slate-950 p-4 space-y-0.5">
              {visibleLogs.length === 0 ? (
                <p className="text-slate-600">Nenhum log registrado.</p>
              ) : visibleLogs.map((l, i) => (
                <div key={i} className="flex gap-2 leading-5">
                  <span className="text-slate-600 flex-shrink-0">{fmtLog(l.ts)}</span>
                  <span className={`flex-shrink-0 w-11 ${LOG_CLR[l.level] ?? 'text-slate-400'}`}>{l.level}</span>
                  <span className="text-slate-400 flex-shrink-0 truncate max-w-[110px]">{l.component}</span>
                  <span className="text-slate-300">{l.message}</span>
                  {l.errorCode && <span className="text-red-400 ml-1">[{l.errorCode}]</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
