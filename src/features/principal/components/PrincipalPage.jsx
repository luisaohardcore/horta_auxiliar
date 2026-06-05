// src/features/principal/components/PrincipalPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler, TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Droplets, Thermometer, Sun, Gauge, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import {
  fetchCurrentTelemetry, fetchTelemetryHistory, fetchWeeklyWaterReport,
} from '../../telemetry/services/telemetryService.js';
import { CANTEIROS_MOCK } from '../../canteiros/mocks/canteiros.mock.js';
import { logger, metrics } from '../../../shared/utils/logger.js';

ChartJS.register(
  CategoryScale, LinearScale, TimeScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
);

const CANTEIROS = CANTEIROS_MOCK;

function StatusBadge({ status }) {
  const map = {
    ok:       'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    offline:  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    suspeito: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? map.ok}`}>
      {status ?? 'ok'}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, unit, colorClass }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {value ?? '—'}{value !== null && value !== undefined ? unit : ''}
        </p>
      </div>
    </div>
  );
}

export default function PrincipalPage() {
  const [selectedCanteiro, setSelectedCanteiro] = useState('canteiro-a');
  const [history, setHistory]     = useState([]);
  const [current, setCurrent]     = useState(null);
  const [waterReport, setWater]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [historyDays, setDays]    = useState(1);
  const renderStart                = useRef(Date.now());

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [hist, cur, report] = await Promise.all([
        fetchTelemetryHistory(selectedCanteiro, historyDays),
        fetchCurrentTelemetry(selectedCanteiro),
        fetchWeeklyWaterReport(),
      ]);
      setHistory(hist);
      setCurrent(cur);
      setWater(report);
      setError(null);
      logger.info('PrincipalPage', 'data_loaded', { canteiro: selectedCanteiro, points: hist.length });
    } catch (err) {
      setError(err.message);
      logger.error('PrincipalPage', 'load_error', { message: err.message });
    } finally {
      setLoading(false);
      const ms = Date.now() - renderStart.current;
      metrics.recordRenderTime('principal', ms);
    }
  }, [selectedCanteiro, historyDays]);

  useEffect(() => {
    renderStart.current = Date.now();
    load(true);
    const iv = setInterval(() => load(false), 60_000);
    return () => clearInterval(iv);
  }, [load]);

  const isDark   = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const textClr  = isDark ? '#94a3b8' : '#334155';
  const gridClr  = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.05)';

  const validHistory = history.filter(d => d.status !== 'offline');
  const hasOffline   = history.some(d => d.status === 'offline');
  const hasSuspicious= history.some(d => d.status === 'suspeito');

  const chartData = {
    datasets: [
      {
        label: '🔥 Temp. Ar (°C)',
        data: validHistory.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.temperatura })),
        borderColor: '#ef4444', borderWidth: 2, tension: 0.4,
        backgroundColor: 'rgba(239,68,68,0.05)', yAxisID: 'y',
      },
      {
        label: '💧 Umidade Solo (%)',
        data: validHistory.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.umidade_solo })),
        borderColor: '#10b981', borderWidth: 2, tension: 0.4,
        backgroundColor: 'transparent', yAxisID: 'y1',
      },
      {
        label: '☀️ Luminosidade (norm. %)',
        data: validHistory.map(d => ({
          x: new Date(d.timestamp).getTime(),
          y: Math.min((d.luminosidade / 130_000) * 100, 100),
        })),
        borderColor: '#eab308', borderWidth: 2, tension: 0.4,
        backgroundColor: 'transparent', yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false, spanGaps: true,
    plugins: { legend: { labels: { color: textClr } } },
    scales: {
      x: { type: 'time', time: { unit: 'hour', displayFormats: { hour: 'dd/MM HH:mm' } },
           grid: { display: false }, ticks: { color: textClr } },
      y:  { type: 'linear', position: 'left', min: 10, max: 40,
            ticks: { color: textClr }, grid: { color: gridClr } },
      y1: { type: 'linear', position: 'right', min: 0, max: 100,
            grid: { drawOnChartArea: false }, ticks: { color: textClr } },
    },
  };

  const barData = {
    labels: waterReport.map(r => r.canteiro_id.replace('canteiro-', 'Canteiro ').toUpperCase()),
    datasets: [
      {
        label: 'Irrigações na semana',
        data: waterReport.map(r => r.irrigacoes),
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textClr } } },
    scales: {
      x: { ticks: { color: textClr }, grid: { display: false } },
      y: { ticks: { color: textClr }, grid: { color: gridClr } },
    },
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500 dark:text-slate-400">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      <p className="font-medium">Carregando dados do canteiro…</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
      <p className="text-red-700 dark:text-red-300 font-semibold mb-4">{error}</p>
      <button onClick={() => load(true)}
        className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg font-medium text-sm">
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="principal-page">

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {CANTEIROS.map(c => (
            <button key={c.id} onClick={() => setSelectedCanteiro(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCanteiro === c.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50'
              }`}>
              {c.nome.split('–')[0].trim()}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {[1, 3, 7].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                historyDays === d
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
              {d}d
            </button>
          ))}
          <button onClick={() => load(true)} className="ml-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Sensor offline / suspicious banners */}
      {hasOffline && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Sensor offline detectado — lacunas no gráfico representam períodos sem sinal.
        </div>
      )}
      {hasSuspicious && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-red-800 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Leitura suspeita detectada (ex.: pH anômalo). Verifique o histórico de alertas.
        </div>
      )}

      {/* Real-time metric cards */}
      {current && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={Thermometer} label="Temp. Ar"    value={current.temperatura}      unit="°C" colorClass="bg-red-100 dark:bg-red-950/50 text-red-500" />
          <MetricCard icon={Thermometer} label="Temp. Solo"  value={current.temperatura_solo} unit="°C" colorClass="bg-orange-100 dark:bg-orange-950/50 text-orange-500" />
          <MetricCard icon={Droplets}    label="Umid. Ar"    value={current.umidade}          unit="%" colorClass="bg-blue-100 dark:bg-blue-950/50 text-blue-500" />
          <MetricCard icon={Droplets}    label="Umid. Solo"  value={current.umidade_solo}     unit="%" colorClass="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500" />
          <MetricCard icon={Sun}         label="Luminosidade" value={current.luminosidade}    unit=" lx" colorClass="bg-yellow-100 dark:bg-yellow-950/50 text-yellow-500" />
          <MetricCard icon={Gauge}       label="pH Solo"     value={current.PH_solo}          unit=""   colorClass="bg-purple-100 dark:bg-purple-950/50 text-purple-500" />
        </div>
      )}

      {/* Main chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Histórico — Temperatura · Umidade Solo · Luminosidade
          </h2>
          <StatusBadge status={current?.status} />
        </div>
        <div className="relative w-full h-72">
          {validHistory.length === 0
            ? <p className="text-slate-400 text-sm text-center mt-20">Sem dados no período selecionado.</p>
            : <Line data={chartData} options={chartOptions} />
          }
        </div>
      </div>

      {/* Weekly water report */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">
          Relatório Semanal — Irrigações por Canteiro
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative h-52">
            {waterReport.length > 0
              ? <Bar data={barData} options={barOptions} />
              : <p className="text-slate-400 text-sm">Sem dados de irrigação.</p>
            }
          </div>
          <div className="space-y-3">
            {waterReport.map(r => (
              <div key={r.canteiro_id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {r.canteiro_id.replace('canteiro-', 'Canteiro ').toUpperCase()}
                </span>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{r.irrigacoes} ciclos</p>
                  <p className="text-xs text-slate-500">≈ {r.estimativa_litros} L</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
