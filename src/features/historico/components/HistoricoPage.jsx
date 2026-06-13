// src/features/historico/components/HistoricoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Loader2, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { fetchHistorico, exportHistoricoCSV } from '../services/historicoService.js';
import { fetchCurrentTelemetry } from '../../telemetry/services/telemetryService.js';
import { useCanteiros } from '../../../shared/hooks/useCanteiros.js';
import ErrorBlock from '../../../shared/components/ErrorBlock.jsx';
import { logger } from '../../../shared/utils/logger.js';

ChartJS.register(
  CategoryScale, LinearScale, TimeScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
);

const isDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const textClr = () => isDark() ? '#94a3b8' : '#475569';
const gridClr = () => isDark() ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.05)';

function baseOpts(title, yLabel = '', min = undefined, max = undefined) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    spanGaps: true,
    animation: { duration: 300 },
    plugins: {
      legend: { labels: { color: textClr(), boxWidth: 12, padding: 16 } },
      title:  { display: !!title, text: title, color: textClr(), font: { size: 13, weight: '600' } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'hour', displayFormats: { hour: 'dd/MM HH:mm' } },
        grid: { display: false },
        ticks: { color: textClr(), maxTicksLimit: 8 },
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

function mkDataset(label, data, color, fill = false, highlightLast = false) {
  const n = data.length;
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: fill ? `${color}18` : 'transparent',
    borderWidth: 2,
    tension: 0.4,
    pointRadius: highlightLast
      ? data.map((_, i) => (i === n - 1 ? 5 : 0))
      : 0,
    pointBackgroundColor: highlightLast
      ? data.map((_, i) => (i === n - 1 ? color : 'transparent'))
      : 'transparent',
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

function StatRow(rows) {
  const valid = rows.filter(d => d !== null && d !== undefined);
  if (!valid.length) return null;
  const min = Math.min(...valid).toFixed(1);
  const max = Math.max(...valid).toFixed(1);
  const avg = (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
  return { min, max, avg };
}

export default function HistoricoPage() {
  const { canteiros } = useCanteiros();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [exporting, setExp]   = useState(false);

  const [filterCanteiro, setCanteiro] = useState('canteiro-a');
  const [filterDays, setDays]         = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, current] = await Promise.all([
        fetchHistorico({ canteiroId: filterCanteiro, days: filterDays, page: 0, limit: 9999 }),
        fetchCurrentTelemetry(filterCanteiro).catch(() => null),
      ]);

      let sorted = [...res.items].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Append current reading if it's newer than the last historical point
      if (current && current.status !== 'offline') {
        const lastTs = sorted.length > 0 ? new Date(sorted[sorted.length - 1].timestamp) : new Date(0);
        const curTs  = new Date(current.timestamp);
        if (curTs > lastTs) {
          sorted = [...sorted, { ...current, _isCurrent: true }];
          logger.info('HistoricoPage', 'current_appended', { timestamp: current.timestamp });
        }
      }

      setRows(sorted);
      setError(null);
      logger.info('HistoricoPage', 'charts_loaded', { points: sorted.length });
    } catch (err) {
      setError(err);
      logger.error('HistoricoPage', 'load_error', { message: err.message, code: err.code });
    } finally {
      setLoading(false);
    }
  }, [filterCanteiro, filterDays]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExp(true);
    try { await exportHistoricoCSV({ canteiroId: filterCanteiro, days: filterDays }); }
    finally { setExp(false); }
  };

  if (error) return <ErrorBlock error={error} onRetry={load} />;

  const hasCurrent = rows.length > 0 && rows[rows.length - 1]._isCurrent;
  const valid = rows.filter(d => d.status !== 'offline');
  const ts    = valid.map(d => new Date(d.timestamp).getTime());

  // Datasets
  const tempAr   = mkDataset('Temp. Ar (°C)',    valid.map((d,i) => ({ x: ts[i], y: d.temperatura })),      '#ef4444', true);
  const tempSolo = mkDataset('Temp. Solo (°C)',   valid.map((d,i) => ({ x: ts[i], y: d.temperatura_solo })), '#f97316', true);
  const humAr    = mkDataset('Umidade Ar (%)',    valid.map((d,i) => ({ x: ts[i], y: d.umidade })),          '#3b82f6', true);
  const humSolo  = mkDataset('Umidade Solo (%)',  valid.map((d,i) => ({ x: ts[i], y: d.umidade_solo })),     '#10b981', true);
  const lux      = mkDataset('Luminosidade (lx)', valid.map((d,i) => ({ x: ts[i], y: d.luminosidade })),    '#eab308', true, true);
  const ph       = mkDataset('pH Solo',           valid.map((d,i) => ({ x: ts[i], y: d.PH_solo })),         '#a855f7', true);

  // Stats
  const tempStats = StatRow(valid.map(d => d.temperatura));
  const humStats  = StatRow(valid.map(d => d.umidade_solo));
  const phStats   = StatRow(valid.map(d => d.PH_solo));
  const luxStats  = StatRow(valid.map(d => d.luminosidade));

  return (
    <div className="space-y-5" data-testid="historico-page">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Canteiro</label>
            <select value={filterCanteiro} onChange={e => setCanteiro(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {canteiros.map(c => <option key={c.id} value={c.id}>{c.nome.split('–')[0].trim()}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Período</label>
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
        <div className="flex gap-2">
          {hasCurrent && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Inclui leitura atual
            </span>
          )}
          <button onClick={load} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && valid.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Temp. Ar', stats: tempStats, unit: ' °C' },
            { label: 'Umidade Solo', stats: humStats, unit: '%' },
            { label: 'pH Solo', stats: phStats, unit: '' },
            { label: 'Luminosidade máx.', stats: luxStats && { ...luxStats, min: undefined }, unit: ' lx' },
          ].map(({ label, stats, unit }) => stats && (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</p>
              <div className="flex justify-between gap-2">
                {stats.min !== undefined && <StatBadge label="mín" value={stats.min} unit={unit} />}
                <StatBadge label="méd" value={stats.avg} unit={unit} />
                <StatBadge label="máx" value={stats.max} unit={unit} />
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
          <p className="font-medium">Carregando histórico…</p>
        </div>
      ) : valid.length === 0 ? (
        <div className="text-center py-20 text-slate-400">Sem leituras válidas no período selecionado.</div>
      ) : (
        <div className="space-y-4">

          {/* Chart 1: Temperatura */}
          <ChartCard title="🌡️ Temperatura (°C)" height={230}>
            <Line data={{ datasets: [tempAr, tempSolo] }} options={baseOpts('', '°C', 10, 40)} />
          </ChartCard>

          {/* Chart 2: Umidade */}
          <ChartCard title="💧 Umidade (%)" height={230}>
            <Line data={{ datasets: [humAr, humSolo] }} options={baseOpts('', '%', 0, 100)} />
          </ChartCard>

          {/* Chart 3: Luminosidade */}
          <ChartCard title="☀️ Luminosidade (lx)" height={210}>
            <Line data={{ datasets: [lux] }} options={baseOpts('', 'lx', 0)} />
          </ChartCard>

          {/* Chart 4: pH */}
          <ChartCard title="🧪 pH do Solo" height={200}>
            <Line data={{ datasets: [ph] }} options={baseOpts('', 'pH', 4, 9)} />
          </ChartCard>

        </div>
      )}
    </div>
  );
}
