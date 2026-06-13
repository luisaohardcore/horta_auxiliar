// src/features/historico/components/HistoricoPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import {
  Loader2, Download, RefreshCw, ChevronsLeft, CheckCircle2,
} from 'lucide-react';
import { fetchHistorico, exportHistoricoCSV } from '../services/historicoService.js';
import { fetchCurrentTelemetry } from '../../telemetry/services/telemetryService.js';
import { useCanteiros } from '../../../shared/hooks/useCanteiros.js';
import ErrorBlock from '../../../shared/components/ErrorBlock.jsx';
import { logger } from '../../../shared/utils/logger.js';

ChartJS.register(
  CategoryScale, LinearScale, TimeScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
);

const isDark  = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const textClr = () => isDark() ? '#94a3b8' : '#475569';
const gridClr = () => isDark() ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.05)';

function baseOpts(yLabel = '', min, max) {
  return {
    responsive: true, maintainAspectRatio: false, spanGaps: true,
    animation: { duration: 200 },
    plugins: {
      legend: { labels: { color: textClr(), boxWidth: 12, padding: 14, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'hour', displayFormats: { hour: 'dd/MM HH:mm' } },
        grid: { display: false },
        ticks: { color: textClr(), maxTicksLimit: 10 },
      },
      y: {
        min, max,
        title: { display: !!yLabel, text: yLabel, color: textClr() },
        grid:  { color: gridClr() },
        ticks: { color: textClr() },
      },
    },
  };
}

function mkDs(label, data, color, fill = false, highlightLast = false) {
  const n = data.length;
  return {
    label, data,
    borderColor: color,
    backgroundColor: fill ? `${color}18` : 'transparent',
    borderWidth: 2, tension: 0.4,
    pointRadius:          highlightLast ? data.map((_, i) => i === n - 1 ? 5 : 0) : 0,
    pointBackgroundColor: highlightLast ? data.map((_, i) => i === n - 1 ? color : 'transparent') : 'transparent',
    pointHoverRadius: 4,
    fill,
  };
}

function ChartCard({ title, height = 220, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">{title}</h3>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function StatBadge({ label, value, unit }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="text-center">
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{value}{unit}</p>
    </div>
  );
}

function stats(arr) {
  const v = arr.filter(x => x !== null && x !== undefined);
  if (!v.length) return null;
  const min = Math.min(...v).toFixed(1);
  const max = Math.max(...v).toFixed(1);
  const avg = (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
  return { min, max, avg };
}

// ── Main component ────────────────────────────────────────────────

export default function HistoricoPage() {
  const { canteiros }             = useCanteiros();
  const [filterCanteiro, setCanteiro] = useState('canteiro-a');
  const [filterDays, setDays]     = useState(1);
  const [loadedDays, setLoadedDays] = useState(1);   // expands on "Carregar mais"
  const [rows, setRows]           = useState([]);     // accumulated chart data
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [hasCurrent, setHasCurrent] = useState(false);
  const [error, setError]         = useState(null);
  const [exporting, setExp]       = useState(false);
  const prevKeyRef                = useRef('');       // reset rows when filter changes
  const prevCountRef              = useRef(0);           // detect new data on load-more

  // ── Load ─────────────────────────────────────────────────────────

  const load = useCallback(async (days, isMore = false) => {
    if (isMore) setLoadingMore(true); else setLoading(true);
    try {
      const [res, current] = await Promise.all([
        fetchHistorico({ canteiroId: filterCanteiro, days, page: 0, limit: 9999 }),
        fetchCurrentTelemetry(filterCanteiro).catch(() => null),
      ]);

      let sorted = [...res.items].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Append current reading if newer than last historical point
      let appended = false;
      if (current && current.status !== 'offline') {
        const lastTs = sorted.length > 0 ? new Date(sorted[sorted.length - 1].timestamp) : new Date(0);
        if (new Date(current.timestamp) > lastTs) {
          sorted = [...sorted, { ...current, _isCurrent: true }];
          appended = true;
        }
      }
      setHasCurrent(appended);

      // hasMore: true if this load returned more records than the previous one
      const prevCount = prevCountRef.current;
      const newCount  = sorted.length;
      setHasMore(newCount > prevCount);
      prevCountRef.current = newCount;
      setRows(sorted);
      setError(null);
      logger.info('HistoricoPage', 'charts_loaded', { points: sorted.length, days });
    } catch (err) {
      setError(err);
      logger.error('HistoricoPage', 'load_error', { message: err.message, code: err.code });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterCanteiro]);

  // Reset when canteiro or filter period changes
  useEffect(() => {
    const key = `${filterCanteiro}-${filterDays}`;
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setLoadedDays(filterDays);
      setHasMore(true);
      prevCountRef.current = 0;
      load(filterDays, false);
    }
  }, [filterCanteiro, filterDays, load]);

  const handleLoadMore = async () => {
    const next = loadedDays + filterDays;
    setLoadedDays(next);
    await load(next, true);
  };

  const handleExport = async () => {
    setExp(true);
    try { await exportHistoricoCSV({ canteiroId: filterCanteiro, days: loadedDays }); }
    finally { setExp(false); }
  };

  // ── Chart data ────────────────────────────────────────────────────

  const valid = rows.filter(d => d.status !== 'offline');
  const ts    = valid.map(d => new Date(d.timestamp).getTime());
  const hl    = true; // highlight last point

  const tempDs  = [mkDs('Temp. Ar (°C)',    valid.map((d, i) => ({ x: ts[i], y: d.temperatura })),      '#ef4444', false, hl),
                   mkDs('Temp. Solo (°C)',   valid.map((d, i) => ({ x: ts[i], y: d.temperatura_solo })), '#f97316', false, hl)];
  const humDs   = [mkDs('Umidade Ar (%)',   valid.map((d, i) => ({ x: ts[i], y: d.umidade })),          '#3b82f6', false, hl),
                   mkDs('Umidade Solo (%)', valid.map((d, i) => ({ x: ts[i], y: d.umidade_solo })),     '#10b981', false, hl)];
  const luxDs   = [mkDs('Luminosidade (lx)', valid.map((d, i) => ({ x: ts[i], y: d.luminosidade })),   '#eab308', true,  hl)];
  const phDs    = [mkDs('pH Solo',           valid.map((d, i) => ({ x: ts[i], y: d.PH_solo })),         '#a855f7', false, hl)];

  const tempStats = stats(valid.map(d => d.temperatura));
  const humStats  = stats(valid.map(d => d.umidade_solo));
  const phStats   = stats(valid.map(d => d.PH_solo));
  const luxStats  = stats(valid.map(d => d.luminosidade));

  // ── Render ────────────────────────────────────────────────────────

  if (error) return <ErrorBlock error={error} onRetry={() => load(loadedDays)} />;

  return (
    <div className="space-y-5" data-testid="historico-page">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap items-end">
          {/* Canteiro */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Canteiro</label>
            <select value={filterCanteiro} onChange={e => setCanteiro(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {canteiros.map(c => <option key={c.id} value={c.id}>{c.nome.split('–')[0].trim()}</option>)}
            </select>
          </div>
          {/* Period filter */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Janela inicial</label>
            <div className="flex gap-1">
              {[1, 3, 7].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterDays === d
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {hasCurrent && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Inclui leitura atual
            </span>
          )}
          <button onClick={() => load(loadedDays)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Range indicator */}
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Exibindo <span className="font-semibold text-slate-600 dark:text-slate-300">{loadedDays} dias</span> de histórico
        · <span className="font-semibold text-slate-600 dark:text-slate-300">{valid.length}</span> leituras válidas
      </p>

      {/* Stats summary */}
      {!loading && valid.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Temp. Ar',      s: tempStats, unit: ' °C' },
            { label: 'Umidade Solo',  s: humStats,  unit: '%'   },
            { label: 'pH Solo',       s: phStats,   unit: ''    },
            { label: 'Luminosidade',  s: luxStats,  unit: ' lx' },
          ].map(({ label, s, unit }) => s && (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</p>
              <div className="flex justify-between gap-1">
                <StatBadge label="mín" value={s.min} unit={unit} />
                <StatBadge label="méd" value={s.avg} unit={unit} />
                <StatBadge label="máx" value={s.max} unit={unit} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts + left-edge load-more button */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
          <p className="font-medium">Carregando histórico…</p>
        </div>
      ) : valid.length === 0 ? (
        <div className="text-center py-20 text-slate-400">Sem leituras válidas no período selecionado.</div>
      ) : (
        <div className="space-y-4">
          {[
            { title: '🌡️ Temperatura (°C)', datasets: tempDs, opts: baseOpts('°C', 10, 40), height: 230 },
            { title: '💧 Umidade (%)',       datasets: humDs,  opts: baseOpts('%', 0, 100),  height: 230 },
            { title: '☀️ Luminosidade (lx)', datasets: luxDs,  opts: baseOpts('lx', 0),      height: 210 },
            { title: '🧪 pH do Solo',        datasets: phDs,   opts: baseOpts('pH', 4, 9),   height: 200 },
          ].map(({ title, datasets, opts, height }) => (
            <div key={title} className="flex gap-0 items-stretch">

              {/* Per-chart left button */}
              <div className="flex-shrink-0 w-10">
                {hasMore ? (
                  <button onClick={handleLoadMore} disabled={loadingMore}
                    title={`Carregar mais ${filterDays} dias`}
                    className="w-full h-full flex flex-col items-center justify-center gap-2
                               bg-slate-50 dark:bg-slate-800/60
                               hover:bg-emerald-50 dark:hover:bg-emerald-950/30
                               border border-r-0 border-slate-200 dark:border-slate-700
                               rounded-l-xl transition-colors disabled:opacity-50 group cursor-pointer">
                    {loadingMore
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      : <>
                          <ChevronsLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                          <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors select-none"
                            style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                            +{filterDays}d
                          </span>
                        </>
                    }
                  </button>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1
                                  bg-emerald-50 dark:bg-emerald-950/20
                                  border border-r-0 border-emerald-200 dark:border-emerald-800
                                  rounded-l-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 select-none"
                      style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                      início
                    </span>
                  </div>
                )}
              </div>

              {/* Chart */}
              <div className="flex-1 min-w-0">
                <ChartCard title={title} height={height}>
                  <Line data={{ datasets }} options={opts} />
                </ChartCard>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
