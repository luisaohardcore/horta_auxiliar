// src/features/alertas/mocks/alertas.mock.js
import { ALL_TELEMETRY } from '../../telemetry/mocks/telemetry.mock.js';

const now = new Date('2026-06-04T08:00:00Z');
const ts  = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3600_000).toISOString();

// Derive alerts from telemetry conditions + add synthetic ones
export const ALERTAS_MOCK = [
  // --- Canteiro A ---
  {
    id: 'alerta-001',
    canteiro_id: 'canteiro-a',
    tipo: 'ph_anomalo',
    severidade: 'critico',
    mensagem: 'pH do solo em 3.8 — valor fora do intervalo seguro (5.5–7.0). Verifique o substrato.',
    timestamp: ts(72), // day 3 noon
    lido: false,
    automatico: true,
  },
  {
    id: 'alerta-002',
    canteiro_id: 'canteiro-a',
    tipo: 'umidade_critica',
    severidade: 'aviso',
    mensagem: 'Umidade do solo abaixo de 35% às 14h. Irrigação automática acionada.',
    timestamp: ts(36),
    lido: true,
    automatico: true,
  },

  // --- Canteiro B (sensor offline) ---
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
    mensagem: 'Leituras de pH inconsistentes detectadas — sensor de pH pode estar com defeito.',
    timestamp: ts(24),
    lido: false,
    automatico: true,
  },

  // --- Canteiro C (manual irrigation) ---
  {
    id: 'alerta-005',
    canteiro_id: 'canteiro-c',
    tipo: 'irrigacao_manual',
    severidade: 'info',
    mensagem: 'Irrigação acionada manualmente pelo operador às 20h00.',
    timestamp: ts(12),
    lido: true,
    automatico: false,
  },
  {
    id: 'alerta-006',
    canteiro_id: 'canteiro-c',
    tipo: 'temperatura_alta',
    severidade: 'aviso',
    mensagem: 'Temperatura do ar acima de 33°C detectada. Risco de estresse hídrico para o Manjericão.',
    timestamp: ts(48),
    lido: false,
    automatico: true,
  },

  // --- General / informational ---
  {
    id: 'alerta-007',
    canteiro_id: 'canteiro-a',
    tipo: 'irrigacao_concluida',
    severidade: 'info',
    mensagem: 'Ciclo de irrigação encerrado normalmente após 8 minutos.',
    timestamp: ts(35),
    lido: true,
    automatico: true,
  },
  {
    id: 'alerta-008',
    canteiro_id: 'canteiro-b',
    tipo: 'umidade_critica',
    severidade: 'aviso',
    mensagem: 'Umidade do solo em 28% — abaixo do limite crítico de 40%. Irrigação necessária.',
    timestamp: ts(18),
    lido: false,
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
