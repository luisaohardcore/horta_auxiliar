// src/features/alertas/components/AlertasPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Bell, BellOff, CheckCircle, Info,
  Filter, Loader2, RefreshCw,
} from 'lucide-react';
import { fetchAlertas, markAlertaLido } from '../services/alertasService.js';
import { CANTEIROS_MOCK } from '../../canteiros/mocks/canteiros.mock.js';
import { TIPOS_ALERTA, SEVERIDADES } from '../mocks/alertas.mock.js';
import { logger, metrics } from '../../../shared/utils/logger.js';
import ErrorBlock from '../../../shared/components/ErrorBlock.jsx';

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
  critico: <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />,
  aviso:   <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  info:    <Info className="w-5 h-5 text-slate-400 flex-shrink-0" />,
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

function fmt(ts) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function AlertasPage() {
  const [alertas, setAlertas]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

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
        page: p, limit: 10,
      });
      setAlertas(prev => p === 0 ? res.items : [...prev, ...res.items]);
      setTotal(res.total);
      setPage(p);
      metrics.recordAlertDisplayed(res.items.length);
      logger.info('AlertasPage', 'loaded', { total: res.total, page: p });
    } catch (err) {
      setError(err);
      logger.error('AlertasPage', 'load_error', { message: err.message });
    } finally {
      setLoading(false);
    }
  }, [filterCanteiro, filterTipo, filterSev, filterPeriod]);

  useEffect(() => { load(0); }, [load]);

  const handleMarkRead = async (id) => {
    await markAlertaLido(id);
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a));
    logger.info('AlertasPage', 'mark_lido', { id });
  };

  const unread = alertas.filter(a => !a.lido).length;
  const hasMore = alertas.length < total;

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
          <div>
            <label className="text-xs text-slate-500 block mb-1">Canteiro</label>
            <select value={filterCanteiro} onChange={e => setCanteiro(e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="todos">Todos</option>
              {CANTEIROS_MOCK.map(c => <option key={c.id} value={c.id}>{c.nome.split('–')[0]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tipo</label>
            <select value={filterTipo} onChange={e => setTipo(e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="todos">Todos</option>
              {TIPOS_ALERTA.map(t => <option key={t} value={t}>{TIPO_LABELS[t] ?? t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Severidade</label>
            <select value={filterSev} onChange={e => setSev(e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="todos">Todas</option>
              {SEVERIDADES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Período</label>
            <select value={filterPeriod} onChange={e => setPeriod(Number(e.target.value))}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value={1}>Último dia</option>
              <option value={3}>Últimos 3 dias</option>
              <option value={7}>Última semana</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert list */}
      {alertas.length === 0 ? (
        <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-3">
          <BellOff className="w-12 h-12" />
          <p className="font-medium">Nenhum alerta para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map(a => (
            <div key={a.id}
              className={`border rounded-xl px-4 py-3 flex items-start gap-3 transition-opacity ${SEV_STYLES[a.severidade]} ${a.lido ? 'opacity-60' : ''}`}>
              {SEV_ICON[a.severidade]}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_BADGE[a.severidade]}`}>
                    {a.severidade}
                  </span>
                  <span className="text-xs text-slate-500">{TIPO_LABELS[a.tipo] ?? a.tipo}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{a.canteiro_id.replace('canteiro-', 'Canteiro ').toUpperCase()}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{fmt(a.timestamp)}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{a.mensagem}</p>
              </div>
              {!a.lido && (
                <button onClick={() => handleMarkRead(a.id)} title="Marcar como lido"
                  className="flex-shrink-0 mt-0.5 p-1 hover:bg-white/60 rounded-lg transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </button>
              )}
            </div>
          ))}

          {hasMore && (
            <button onClick={() => load(page + 1, false)}
              disabled={loading}
              className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Carregar mais ({total - alertas.length} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
