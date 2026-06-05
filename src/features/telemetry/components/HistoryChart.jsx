import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale // <-- O vilão da história
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { 
  Loader2, 
  AlertCircle, 
  Info, 
  Droplets, 
  Thermometer, 
  Sun, 
  Gauge 
} from 'lucide-react';
import { fetchTelemetryHistory, fetchCurrentTelemetry } from '../services/telemetryService.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale, // <-- Registro explícito para evitar o erro "not a registered scale"
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const HistoryChart = ({ activeTab }) => {
  const [historyData, setHistoryData] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testBombaAtiva, setTestBombaAtiva] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

 const loadAllData = async (showLoading = false) => {
  if (showLoading) setLoading(true);
    try {
      const history = await fetchTelemetryHistory();
      const current = await fetchCurrentTelemetry();
      
      if (history.erro || current.erro) {
        setHistoryData([]);
        setCurrentData(null);
      } else {
        // Intercepta e força o estado atual a obedecer ao botão de teste
        const adjustedCurrent = { 
          ...current, 
          status_bomba: testBombaAtiva 
        };
        
        // Garante que o último ponto mapeado no histórico acompanhe o clique
        const adjustedHistory = (Array.isArray(history) ? history : [history]).map((d, index, arr) => {
          if (index === arr.length - 1) {
            return { ...d, status_bomba: testBombaAtiva };
          }
          return d;
        });

        setHistoryData(adjustedHistory);
        setCurrentData(adjustedCurrent);
        setError(null);
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
      setError("Falha ao conectar com o servidor da Horta na nuvem.");
    } finally {
      setLoading(false);
    }
  };

  // Efeito para recarregar dados e monitorar mudanças no estado do botão de teste
useEffect(() => {
  loadAllData();

  const slowTimer = setTimeout(() => setIsSlowConnection(true), 6000);
  const interval = setInterval(() => loadAllData(), 60000);

  return () => {
    clearTimeout(slowTimer);
    clearInterval(interval);
  };
}, [testBombaAtiva]);

  if (loading) {
  return (
    <div className="w-full h-[400px] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
      <p className="text-slate-500 dark:text-slate-400 font-medium">
        Conectando à API da Horta...
      </p>
      {isSlowConnection && (
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-2 max-w-xs">
          O servidor pode estar acordando após um período inativo. Isso pode levar até 40 segundos.
        </p>
      )}
    </div>
  );
}

  if (error) {
    return (
      <div className="w-full h-[400px] bg-red-50 rounded-xl shadow-sm border border-red-200 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Falha na Sincronização</h3>
        <p className="text-red-600 max-w-md">{error}</p>
        <button onClick={() => loadAllData(true)} className="mt-6 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors">
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (historyData.length === 0 || !currentData) {
    return (
      <div className="w-full h-[400px] bg-slate-50 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-6 text-center">
        <Info className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Aguardando primeira leitura do sensor...</h3>
        <p className="text-slate-500 max-w-md">Os dados aparecerão aqui assim que o primeiro registro for salvo no banco.</p>
      </div>
    );
  }

  // Configuração das linhas do gráfico principal (Ar, Solo e Bomba)
  const chartData = {
    datasets: [
      {
        label: '☀️ Luminosidade (%)',
        // Normalização: (Valor Atual / Máximo Esperado) * 100
        // Limitamos em 100 para não distorcer o gráfico caso passe de 130k
        data: historyData.map(d => ({ x: new Date(d.timestamp).getTime(), y: Math.min((d.luminosidade / 130000) * 100, 100) })),
        borderColor: '#eab308',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y1', // Compartilha o eixo com a umidade
        pointRadius: 0,
      },
      {
        label: '🌊 Status da Bomba (Ligada/Desligada)',
        data: historyData.map(d => ({
          x: new Date(d.timestamp).getTime(),
          y: d.status_bomba ? 100 : 0
        })),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.4)',
        borderWidth: 2,
        fill: true,
        stepped: 'after',
        yAxisID: 'y1',
        pointRadius: 0,
        tension: 0,
        order: 10,
      },
      {
        label: '🔥 Temp. Ar (°C)',
        data: historyData.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.temperatura })),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: '🌱 Temp. Solo (°C)',
       data: historyData.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.temperatura_solo })),
        borderColor: '#f97316',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: '💧 Umidade Ar (%)',
        data: historyData.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.umidade })),
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y1',
      },
      {
        label: '🌾 Umidade Solo (%)',
        data: historyData.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.umidade_solo })),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor = isDarkMode ? '#94a3b8' : '#334155';
  const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.05)';

  const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { labels: { color: textColor } } 
  },
  scales: {
    x: { 
      type: 'time', // <-- Muda de 'category' para 'time'
      time: {
        unit: 'minute',
        tooltipFormat: 'HH:mm',
        displayFormats: { minute: 'HH:mm' }
      },
      grid: { display: false }, 
      ticks: { color: textColor } 
    },
    y: {
  type: 'linear',
  position: 'left',
  min: 10,
  max: 40,
  ticks: { color: textColor },
  grid: { color: gridColor }
},
y1: {
  type: 'linear',
  position: 'right',
  min: 0,
  max: 100,
  grid: { drawOnChartArea: false },
  ticks: { color: textColor }
}
  }
};

  return (
    <div className="space-y-6 transition-colors duration-300">
      
      {/* ⚙️ PAINEL DE SIMULAÇÃO LOCAL DE ENGENHARIA */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Modo de Teste de Software</h4>
          <p className="text-xs text-amber-600 dark:text-amber-500">Altere as variáveis do mock em tempo real para validar intertravamentos.</p>
        </div>
        
        <button
          type="button"
          onClick={() => {
            // Se a bomba estiver desligada e o usuário tentar ligar...
            if (!testBombaAtiva) {
              const LIMITE_UMIDADE = 65; // Valor X correspondente ao intertravamento
              
              // Valida se o estado atual ultrapassa a margem segura
              if (currentData && currentData.umidade_solo > LIMITE_UMIDADE) {
                const confirmar = window.confirm(
                  `⚠️ ALERTA DE SEGURANÇA:\nA umidade do solo está em ${currentData.umidade_solo}%, que é superior ao limite ideal de ${LIMITE_UMIDADE}%.\nDeseja realmente forçar a ativação da bomba e irrigar o solo já molhado?`
                );
                
                // Se abortar, encerra a execução sem alterar o estado
                if (!confirmar) return;
              }
            }
            
            setTestBombaAtiva(!testBombaAtiva);
          }}
          className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm ${
            testBombaAtiva 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
          }`}
        >
          {testBombaAtiva ? "⚡ Desligar Bomba (Simulação)" : "💧 Ligar Bomba (Simulação)"}
        </button>
      </div>

      {/* STATUS DA BOMBA - Visível em ambas as abas */}
      <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
        currentData.status_bomba 
          ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300' 
          : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
      }`}>
        <div className="flex items-center gap-3">
          <Droplets className={currentData.status_bomba ? "animate-bounce text-blue-500" : ""} />
          <span className="font-semibold">Status do Sistema de Irrigação:</span>
        </div>
        <span className="font-bold uppercase tracking-wider">
          {currentData.status_bomba ? "🌊 Bomba Ligada" : "❌ Bomba Desligada"}
        </span>
      </div>

      {/* 🌟 CONDICIONAL: Os gráficos só aparecem se a aba ativa for "historico" */}
      {activeTab === 'historico' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Gráfico Principal */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Histórico Clínico (Ar vs Solo)</h2>
            <div className="relative w-full h-[300px] mt-4">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Gráfico Exclusivo do pH */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between transition-colors">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Estabilidade do pH</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Escala ideal para cultivo: 5.5 a 6.8</p>
            </div>
            
            <div className="relative w-full h-[200px] mt-2">
              <Line 
                data={{
                  datasets: [{
                    label: '🧪 Nível de pH',
                    data: historyData.map(d => ({ x: new Date(d.timestamp).getTime(), y: d.PH_solo })),
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.3,
                  }]
                }} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { 
                      min: 0, 
                      max: 14, 
                      ticks: { stepSize: 2, color: textColor },
                      grid: { color: gridColor }
                    },
                    x: { 
                        type: 'time',
                        time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
                        ticks: { color: textColor } 
                      }
                  },
                  plugins: { legend: { labels: { color: textColor } } }
                }}
              />
            </div>

            <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center border border-purple-100 dark:border-purple-900 transition-colors">
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                {currentData.PH_solo < 6.0 ? "⚠️ Solo Levemente Ácido" : currentData.PH_solo > 7.0 ? "⚠️ Solo Alcalino" : "✅ Solo Ideal (Neutro)"}
              </span>
            </div>
          </div>

        </div>
      )}
      
      {/* SEÇÃO DOS CARDS EM TEMPO REAL */}
      {activeTab === 'tempo-real' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
         
         {/* Temperatura do Ar */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-500 dark:text-red-400">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Temperatura do Ar</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentData.temperatura}°C</p>
            </div>
         </div>

         {/* Umidade do Ar */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-500 dark:text-blue-400">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Umidade do Ar</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentData.umidade}%</p>
            </div>
         </div>

         {/* Umidade do Solo */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Umidade do Solo</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentData.umidade_solo}%</p>
            </div>
         </div>

         {/* Temperatura do Solo */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-500 dark:text-orange-400">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Temperatura do Solo</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentData.temperatura_solo}°C</p>
            </div>
         </div>

         {/* Luminosidade */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center text-yellow-500 dark:text-yellow-400">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Luminosidade</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentData.luminosidade} LxA</p>
            </div>
         </div>

         {/* pH do Solo */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-500 dark:text-purple-400">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">pH do Solo</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentData.PH_solo}</p>
            </div>
         </div>

      </div>)}
    </div>
  );
};

export default HistoryChart;