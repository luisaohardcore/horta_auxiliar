// src/features/alertas/mocks/alertas.mock.js
// All timestamps relative to Date.now() so alerts always appear in current filters.

const now = new Date();
const ts  = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3600_000).toISOString();

export const ALERTAS_MOCK = [
  // ── Canteiro A ──────────────────────────────────────────────────
  {
    id: 'alerta-001',
    canteiro_id: 'canteiro-a',
    tipo: 'ph_anomalo',
    severidade: 'critico',
    mensagem: 'pH do solo em 3.8 — valor fora do intervalo seguro (5.5–7.0). Verifique o substrato.',
    timestamp: ts(72),
    lido: false,
    automatico: true,
  },
  {
    id: 'alerta-002',
    canteiro_id: 'canteiro-a',
    tipo: 'umidade_critica',
    severidade: 'aviso',
    mensagem: 'Umidade do solo em 29% — abaixo do limite crítico de 35%. Irrigação automática acionada.',
    timestamp: ts(36),
    lido: true,
    automatico: true,
  },
  {
    id: 'alerta-007',
    canteiro_id: 'canteiro-a',
    tipo: 'irrigacao_concluida',
    severidade: 'info',
    mensagem: 'Ciclo de irrigação encerrado normalmente após 8 minutos. Volume estimado: 96 L.',
    timestamp: ts(35),
    lido: true,
    automatico: true,
  },
  {
    id: 'alerta-009',
    canteiro_id: 'canteiro-a',
    tipo: 'temperatura_alta',
    severidade: 'aviso',
    mensagem: 'Temperatura do ar acima de 32°C detectada. Risco de estresse hídrico para a Alface.',
    timestamp: ts(10),
    lido: false,
    automatico: true,
  },

  // ── Canteiro B ──────────────────────────────────────────────────
  {
    id: 'alerta-003',
    canteiro_id: 'canteiro-b',
    tipo: 'sensor_offline',
    severidade: 'critico',
    mensagem: 'Sensor do Canteiro B sem sinal há 6 horas. Verifique a alimentação do nó campo.',
    timestamp: ts(6),
    lido: false,
    automatico: true,
  },
  {
    id: 'alerta-004',
    canteiro_id: 'canteiro-b',
    tipo: 'dado_parcial',
    severidade: 'aviso',
    mensagem: 'Leituras de pH inconsistentes (null em 10% das amostras). Sensor de pH pode estar com defeito.',
    timestamp: ts(24),
    lido: false,
    automatico: true,
  },
  {
    id: 'alerta-008',
    canteiro_id: 'canteiro-b',
    tipo: 'umidade_critica',
    severidade: 'critico',
    mensagem: 'Umidade do solo em 28% — bem abaixo do limite de 40% para Tomate. Irrigação necessária.',
    timestamp: ts(18),
    lido: false,
    automatico: true,
  },

  // ── Canteiro C ──────────────────────────────────────────────────
  {
    id: 'alerta-005',
    canteiro_id: 'canteiro-c',
    tipo: 'irrigacao_manual',
    severidade: 'info',
    mensagem: 'Irrigação acionada manualmente pelo operador às 20h00. Ciclo de 10 minutos iniciado.',
    timestamp: ts(12),
    lido: true,
    automatico: false,
  },
  {
    id: 'alerta-006',
    canteiro_id: 'canteiro-c',
    tipo: 'temperatura_alta',
    severidade: 'aviso',
    mensagem: 'Temperatura do ar acima de 33°C. Risco de estresse hídrico para o Manjericão.',
    timestamp: ts(48),
    lido: false,
    automatico: true,
  },
  {
    id: 'alerta-010',
    canteiro_id: 'canteiro-c',
    tipo: 'irrigacao_concluida',
    severidade: 'info',
    mensagem: 'Ciclo de irrigação manual encerrado. Volume estimado: 120 L.',
    timestamp: ts(11),
    lido: true,
    automatico: false,
  },

  // ── Alertas mais antigos (visíveis no filtro de 7 dias) ─────────
  {
    id: 'alerta-011',
    canteiro_id: 'canteiro-a',
    tipo: 'umidade_critica',
    severidade: 'aviso',
    mensagem: 'Umidade do solo em 31% — irrigação automática acionada.',
    timestamp: ts(96),
    lido: true,
    automatico: true,
  },
  {
    id: 'alerta-012',
    canteiro_id: 'canteiro-b',
    tipo: 'temperatura_alta',
    severidade: 'aviso',
    mensagem: 'Temperatura do solo acima de 28°C detectada no Canteiro B.',
    timestamp: ts(120),
    lido: true,
    automatico: true,
  },
  {
    id: 'alerta-013',
    canteiro_id: 'canteiro-c',
    tipo: 'ph_anomalo',
    severidade: 'aviso',
    mensagem: 'pH do solo em 5.1 — levemente abaixo do ideal para Manjericão (5.5–7.0).',
    timestamp: ts(144),
    lido: true,
    automatico: true,
  },
  {
    id: 'alerta-014',
    canteiro_id: 'canteiro-a',
    tipo: 'sensor_offline',
    severidade: 'critico',
    mensagem: 'Canteiro A sem sinal por 2 horas — possível reinicialização do ESP32.',
    timestamp: ts(160),
    lido: true,
    automatico: true,
  },
];

export const TIPOS_ALERTA = [
  'umidade_critica',
  'temperatura_alta',
  'sensor_offline',
  'dado_parcial',
  'irrigacao_manual',
  'irrigacao_concluida',
  'ph_anomalo',
];

export const SEVERIDADES = ['critico', 'aviso', 'info'];
