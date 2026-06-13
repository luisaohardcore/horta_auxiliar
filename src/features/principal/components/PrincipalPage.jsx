// src/features/principal/components/PrincipalPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler, TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import {
  Droplets, Thermometer, Sun, Gauge, Wifi, WifiOff,
  RefreshCw, Loader2, Clock, Power,
} from 'lucide-react';
import {
  fetchCurrentTelemetry, fetchTelemetryHistory, fetchWeeklyWaterReport,
} from '../../telemetry/services/telemetryService.js';
import {
  toggleBomba, getBombaStatus, syncBombaFromTelemetry,
} from '../../irrigacao/services/irrigacaoService.js';
import { useCanteiros } from '../../../shared/hooks/useCanteiros.js';
import ErrorBlock from '../../../shared/components/ErrorBlock.jsx';
import { logger } from '../../../shared/utils/logger.js';

ChartJS.register(
  CategoryScale, LinearScale, TimeScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
);

const TREND_MAX = 60;
const _trendBuffer = {};

const isDark  = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const textClr = () => isDark() ? '#94a3b8' : '#475569';
const gridClr = () => isDark() ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.05)';

// ── Sub-components ────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, unit, colorClass, offline }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-5 flex items-center gap-4 transition-opacity ${offline ? 'opacity-40' : ''} border-slate-200 dark:border-slate-800`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {offline || value === null || value === undefined ? '—' : `${value}${unit}`}
        </p>
      </div>
    </div>
  );
}

const CARDS = [
  { key: 'temperatura',      label: 'Temperatura Ar',  unit: ' °C', icon: Thermometer, color: 'bg-red-100 dark:bg-red-950/50 text-red-500' },
  { key: 'temperatura_solo', label: 'Temperatura Solo', unit: ' °C', icon: Thermometer, color: 'bg-orange-100 dark:bg-orange-950/50 text-orange-500' },
  { key: 'umidade',          label: 'Umidade Ar',       unit: '%',   icon: Droplets,    color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-500' },
  { key: 'umidade_solo',     label: 'Umidade Solo',     unit: '%',   icon: Droplets,    color: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500' },
  { key: 'luminosidade',     label: 'Luminosidade',     unit: ' lx', icon: Sun,         color: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-500' },
  { key: 'PH_solo',          label: 'pH Solo',          unit: '',    icon: Gauge,       color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-500' },
];

// ── Main component ────────────────────────────────────────────────

export default function PrincipalPage() {
  const { canteiros }               = useCanteiros();
  const [selected, setSelected]     = useState('canteiro-a');
  const [current, setCurrent]       = useState(null);
  const [history, setHistory]       = useState([]);
  const [waterReport, setWater]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [bombaLoading, setBombaLoading] = useState(false);
  const [bombaError, setBombaError]     = useState(null);
  const [bombaAtiva, setBombaAtiva]     = useState(false);

  // ── Data loading ────────────────────────────────────────────────

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [cur, hist, report] = await Promise.all([
        fetchCurrentTelemetry(selected),
        fetchTelemetryHistory(selected, 1),
        fetchWeeklyWaterReport(),
      ]);

      setCurrent(cur);
      setHistory(hist);
      setWater(report);
      setLastUpdate(new Date());
      setError(null);

      syncBombaFromTelemetry(selected, cur?.status_bomba);
      setBombaAtiva(getBombaStatus(selected));

      // Trend buffer
      if (cur && cur.status !== 'offline') {
        const buf = _trendBuffer[selected] ?? [];
        _trendBuffer[selected] = [...buf, {
          ts: Date.now(),
          temperatura:      cur.temperatura,
          temperatura_solo: cur.temperatura_solo,
          umidade:          cur.umidade,
          umidade_solo:     cur.umidade_solo,
          luminosidade:     cur.luminosidade,
          PH_solo:          cur.PH_solo,
        }].slice(-TREND_MAX);
      }

      logger.info('PrincipalPage', 'data_loaded', { canteiro: selected });
    } catch (err) {
      setError(err);
      logger.error('PrincipalPage', 'load_error', { message: err.message, code: err.code });
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    setLoading(true);
    setCurrent(null);
    setBombaAtiva(getBombaStatus(selected));
    setBombaError(null);
    load(true);
  }, [load]);

  const loadRef = React.useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => {
    const iv = setInterval(() => loadRef.current(false), 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Pump control ────────────────────────────────────────────────

  const handleToggleBomba = async () => {
    setBombaLoading(true);
    setBombaError(null);
    const novoEstado = !bombaAtiva;
    try {
      await toggleBomba(selected, novoEstado);
      setBombaAtiva(novoEstado);
      logger.info('PrincipalPage', 'bomba_toggled', { canteiro: selected, ativo: novoEstado });
      load(false);
    } catch (err) {
      setBombaError(err.message ?? 'Erro ao acionar bomba.');
    } finally {
      setBombaLoading(false);
    }
  };

  // ── Chart helpers ───────────────────────────────────────────────

  const validHist  = history.filter(d => d.status !== 'offline');
  const histTs     = validHist.map(d => new Date(d.timestamp).getTime());
  const trend      = _trendBuffer[selected] ?? [];

  const mkLine = (label, data, color) => ({
    label, data,
    borderColor: color, backgroundColor: 'transparent',
    borderWidth: 2, tension: 0.4, pointRadius: 0, pointHoverRadius: 4,
  });

  const histChartData = {
    datasets: [
      mkLine('Temp. Ar (°C)',   validHist.map((d, i) => ({ x: histTs[i], y: d.temperatura })),      '#ef4444'),
      mkLine('Umidade Solo (%)',validHist.map((d, i) => ({ x: histTs[i], y: d.umidade_solo })),      '#10b981'),
      mkLine('Lum. (norm. %)',  validHist.map((d, i) => ({ x: histTs[i], y: d.luminosidade ? Math.min((d.luminosidade / 130_000) * 100, 100) : 0 })), '#eab308'),
    ],
  };

  const histOpts = {
    responsive: true, maintainAspectRatio: false, spanGaps: true, animation: false,
    plugins: {
      legend: { labels: { color: textClr(), boxWidth: 10, padding: 12, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { type: 'time', time: { unit: 'hour', displayFormats: { hour: 'HH:mm' } },
           grid: { display: false }, ticks: { color: textClr(), maxTicksLimit: 8 } },
      y: { min: 0, max: 100, grid: { color: gridClr() }, ticks: { color: textClr() } },
    },
  };

  const reportLabels = waterReport.map(r =>
    r.canteiro_id.replace('canteiro-', 'Canteiro ').toUpperCase()
  );
  const barData = {
    labels: reportLabels,
    datasets: [{
      label: 'Irrigações na semana',
      data: waterReport.map(r => r.irrigacoes),
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444'],
      borderRadius: 6,
    }],
  };
  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textClr() } },
      y: { grid: { color: gridClr() }, ticks: { color: textClr(), stepSize: 1 } },
    },
  };

  const trendData = {
    datasets: [
      { label: 'Temp. Ar (°C)',    data: trend.map(p => ({ x: p.ts, y: p.temperatura })),      borderColor: '#ef4444', borderWidth: 2, tension: 0.4, pointRadius: trend.length < 10 ? 3 : 0, pointHoverRadius: 4, backgroundColor: 'transparent', yAxisID: 'y' },
      { label: 'Umidade Solo (%)', data: trend.map(p => ({ x: p.ts, y: p.umidade_solo })),      borderColor: '#10b981', borderWidth: 2, tension: 0.4, pointRadius: trend.length < 10 ? 3 : 0, pointHoverRadius: 4, backgroundColor: 'transparent', yAxisID: 'y1' },
    ],
  };
  const trendOpts = {
    responsive: true, maintainAspectRatio: false, animation: false, spanGaps: true,
    plugins: { legend: { labels: { color: textClr(), boxWidth: 10, padding: 12, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { type: 'time', time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } }, grid: { display: false }, ticks: { color: textClr(), maxTicksLimit: 6 } },
      y:  { type: 'linear', position: 'left',  min: 10, max: 40, title: { display: true, text: '°C', color: textClr() }, grid: { color: gridClr() }, ticks: { color: textClr() } },
      y1: { type: 'linear', position: 'right', min: 0,  max: 100, title: { display: true, text: '%', color: textClr() }, grid: { drawOnChartArea: false }, ticks: { color: textClr() } },
    },
  };

  // ── Render ────────────────────────────────────────────────────────

  const isOffline = current?.status === 'offline';

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      <p className="font-medium">Carregando dados…</p>
    </div>
  );

  if (error) return <ErrorBlock error={error} onRetry={() => load(true)} />;

  return (
    <div className="space-y-5" data-testid="principal-page">

      {/* Canteiro selector + timestamp */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {canteiros.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selected === c.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50'
              }`}>
              {c.nome.split('–')[0].trim()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {lastUpdate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button onClick={() => load(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
        isOffline
          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
          : current?.status === 'suspeito'
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300'
          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
      }`}>
        {isOffline ? <WifiOff className="w-4 h-4 flex-shrink-0" /> : <Wifi className="w-4 h-4 flex-shrink-0" />}
        {isOffline
          ? 'Sensor offline — última leitura indisponível.'
          : current?.status === 'suspeito'
          ? 'Leitura suspeita detectada — verifique o sensor.'
          : `Sensor online · Irrigação: ${bombaAtiva ? 'ativa (manual)' : 'inativa'}`
        }
      </div>

      {/* Current metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(({ key, label, unit, icon, color }) => (
          <MetricCard key={key} icon={icon} label={label}
            value={current?.[key]} unit={unit} colorClass={color} offline={isOffline} />
        ))}
      </div>

      {/* ── GAP 2 FIX: Gráficos históricos (últimas 24h) ─────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Temperatura · Umidade · Luminosidade — últimas 24h
          </h3>
          <span className="text-xs text-slate-400">{validHist.length} leituras</span>
        </div>
        {validHist.length < 2 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            Sem leituras suficientes no período.
          </div>
        ) : (
          <div className="h-56">
            <Line data={histChartData} options={histOpts} />
          </div>
        )}
      </div>

      {/* Pump control */}
      <div className={`rounded-xl border shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
        bombaAtiva
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            bombaAtiva ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <Droplets className={`w-6 h-6 ${bombaAtiva ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Bomba de Irrigação</p>
            <p className={`text-xs font-medium mt-0.5 ${bombaAtiva ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {bombaAtiva ? '● Ativa — irrigação em andamento' : '○ Inativa'}
            </p>
            {bombaError && <p className="text-xs text-red-500 mt-1">{bombaError}</p>}
          </div>
        </div>
        <button onClick={handleToggleBomba} disabled={bombaLoading || isOffline}
          title={isOffline ? 'Sensor offline — não é possível acionar' : ''}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            bombaAtiva
              ? 'bg-red-100 hover:bg-red-200 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
          }`}>
          {bombaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          {bombaAtiva ? 'Desligar bomba' : 'Ligar bomba'}
        </button>
      </div>

      {/* ── GAP 1 FIX: Relatório semanal de irrigação ────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
          Relatório Semanal — Irrigações por Canteiro
        </h3>
        {waterReport.length === 0 ? (
          <p className="text-sm text-slate-400">Sem dados de irrigação na semana.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-44">
              <Bar data={barData} options={barOpts} />
            </div>
            <div className="space-y-2">
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
        )}
      </div>

      {/* Session trend */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Tendência da sessão</h3>
          <span className="text-xs text-slate-400">{trend.length} leitura{trend.length !== 1 ? 's' : ''} · atualiza a cada 60s</span>
        </div>
        {trend.length < 1 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-xs">Aguardando leituras para construir tendência…</p>
          </div>
        ) : (
          <div className="h-52">
            <Line data={trendData} options={trendOpts} />
          </div>
        )}
      </div>

    </div>
  );
}
