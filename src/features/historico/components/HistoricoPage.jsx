// src/features/historico/components/HistoricoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, AlertTriangle, Download, ChevronLeft, ChevronRight,
  WifiOff, AlertCircle, CheckCircle,
} from 'lucide-react';
import { fetchHistorico, exportHistoricoCSV } from '../services/historicoService.js';
import { CANTEIROS_MOCK } from '../../canteiros/mocks/canteiros.mock.js';
import { logger } from '../../../shared/utils/logger.js';
import ErrorBlock from '../../../shared/components/ErrorBlock.jsx';

function fmt(ts) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusCell({ status }) {
  const map = {
    ok:       { icon: <CheckCircle  className="w-3.5 h-3.5 text-emerald-500" />, label: 'ok',        cls: 'text-emerald-700 dark:text-emerald-400' },
    offline:  { icon: <WifiOff      className="w-3.5 h-3.5 text-red-500"     />, label: 'offline',   cls: 'text-red-600 dark:text-red-400' },
    suspeito: { icon: <AlertCircle  className="w-3.5 h-3.5 text-amber-500"   />, label: 'suspeito',  cls: 'text-amber-600 dark:text-amber-400' },
  };
  const s = map[status] ?? map.ok;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

function Cell({ value, unit = '' }) {
  if (value === null || value === undefined) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  return <span>{value}{unit}</span>;
}

export default function HistoricoPage() {
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [totalPages, setPages]  = useState(1);
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [exporting, setExport]  = useState(false);

  const [filterCanteiro, setCanteiro] = useState('todos');
  const [filterDays, setDays]         = useState(7);

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const res = await fetchHistorico({ canteiroId: filterCanteiro, days: filterDays, page: p });
      setRows(res.items);
      setTotal(res.total);
      setPages(res.totalPages);
      setPage(res.page);
      logger.info('HistoricoPage', 'loaded', { total: res.total, page: p });
    } catch (err) {
      setError(err);
      logger.error('HistoricoPage', 'load_error', { message: err.message });
    } finally {
      setLoading(false);
    }
  }, [filterCanteiro, filterDays]);

  useEffect(() => { load(0); }, [load]);

  const handleExport = async () => {
    setExport(true);
    try {
      await exportHistoricoCSV({ canteiroId: filterCanteiro, days: filterDays });
    } finally {
      setExport(false);
    }
  };

  if (error) return <ErrorBlock error={error} onRetry={() => load(0)} />;

  return (
    <div className="space-y-5" data-testid="historico-page">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Canteiro</label>
            <select value={filterCanteiro} onChange={e => setCanteiro(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value="todos">Todos</option>
              {CANTEIROS_MOCK.map(c => <option key={c.id} value={c.id}>{c.nome.split('–')[0]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Período</label>
            <select value={filterDays} onChange={e => setDays(Number(e.target.value))}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <option value={1}>1 dia</option>
              <option value={3}>3 dias</option>
              <option value={7}>7 dias</option>
            </select>
          </div>
        </div>

        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar CSV
        </button>
      </div>

      {/* Summary row */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {loading ? 'Carregando…' : `${total} registros encontrados`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800">
            <tr className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {['Timestamp', 'Canteiro', 'Temp. Ar', 'Temp. Solo', 'Umid. Ar', 'Umid. Solo', 'Lux', 'pH', 'Bomba', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && rows.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-400">Sem registros.</td></tr>
            ) : rows.map(d => (
              <tr key={`${d.canteiro_id}-${d.id}`}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                  d.status === 'offline'  ? 'bg-red-50/50 dark:bg-red-950/10'   :
                  d.status === 'suspeito' ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
                }`}>
                <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono text-xs">{fmt(d.timestamp)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                  {d.canteiro_id.replace('canteiro-', 'C').toUpperCase()}
                </td>
                <td className="px-4 py-2.5"><Cell value={d.temperatura}      unit="°C" /></td>
                <td className="px-4 py-2.5"><Cell value={d.temperatura_solo} unit="°C" /></td>
                <td className="px-4 py-2.5"><Cell value={d.umidade}          unit="%" /></td>
                <td className="px-4 py-2.5"><Cell value={d.umidade_solo}     unit="%" /></td>
                <td className="px-4 py-2.5"><Cell value={d.luminosidade}     unit=" lx" /></td>
                <td className="px-4 py-2.5"><Cell value={d.PH_solo} /></td>
                <td className="px-4 py-2.5">
                  {d.status_bomba
                    ? <span className={`text-xs font-semibold ${d.irrigacao_manual ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {d.irrigacao_manual ? '✋ Manual' : '⚡ Auto'}
                      </span>
                    : <span className="text-xs text-slate-400">off</span>
                  }
                </td>
                <td className="px-4 py-2.5"><StatusCell status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => load(page - 1)} disabled={page === 0 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => load(page + 1)} disabled={page >= totalPages - 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
