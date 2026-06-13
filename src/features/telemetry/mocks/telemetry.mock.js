// src/features/telemetry/mocks/telemetry.mock.js
//
// Generates 7 days of hourly readings anchored to NOW so date filters always work.
// edge scenarios per canteiro:
//   'normal'           → Canteiro A — happy path + pH spike (suspicious) at day 3 noon
//   'sensor-offline'   → Canteiro B — last 6h offline + intermittent missing pH
//   'manual-irrigation'→ Canteiro C — manual pump trigger 12h ago, no auto-irrigation

export const generateTelemetryForCanteiro = (canteiroId, edge = 'normal') => {
  const data  = [];
  const now   = new Date(); // ← always relative to NOW
  const HOURS = 7 * 24;

  let temp     = 22;
  let tempSolo = 20;
  let hum      = 70;
  let humSolo  = 60;
  let ph       = 6.4;

  const offlineStart    = edge === 'sensor-offline'    ? HOURS - 6  : -1;
  const manualIrrigHour = edge === 'manual-irrigation' ? HOURS - 12 : -1;

  for (let i = HOURS; i >= 0; i--) {
    const time   = new Date(now.getTime() - i * 3600_000);
    const hour   = time.getUTCHours();
    const isDay  = hour > 6 && hour < 19;
    const idx    = HOURS - i;

    // Offline window
    if (idx >= offlineStart && offlineStart !== -1) {
      data.push({
        id: idx, canteiro_id: canteiroId,
        timestamp: time.toISOString(),
        temperatura: null, temperatura_solo: null,
        umidade: null, umidade_solo: null,
        luminosidade: null, PH_solo: null,
        status_bomba: false, irrigacao_manual: false, status: 'offline',
      });
      continue;
    }

    // Organic drift
    temp     += isDay ? (Math.random() * 2 - 0.5)   : (Math.random() * -2 + 0.5);
    tempSolo += isDay ? (Math.random() * 1.5 - 0.4) : (Math.random() * -1.5 + 0.4);
    hum      += isDay ? (Math.random() * -3 + 0.5)  : (Math.random() * 3 - 0.5);
    humSolo  += isDay ? (Math.random() * -2 + 0.3)  : (Math.random() * 2 - 0.3);
    ph       += (Math.random() * 0.1 - 0.05);

    temp     = Math.max(18, Math.min(34, temp));
    tempSolo = Math.max(15, Math.min(30, tempSolo));
    hum      = Math.max(40, Math.min(92, hum));
    humSolo  = Math.max(28, Math.min(88, humSolo));
    ph       = Math.max(5.2, Math.min(7.5, ph));

    // Luminosity bell curve around solar noon
    const peak = 13;
    const lux  = isDay
      ? Math.round(Math.max(0, 130_000 - Math.abs(hour - peak) * 18_000 + (Math.random() * 10_000 - 5_000)))
      : 0;

    // pH spike at day 3 noon (suspicious reading) — only canteiro A
    const isSuspicious = edge === 'normal' && idx === 72 + 12;
    const displayPh    = isSuspicious ? 3.8 : parseFloat(ph.toFixed(2));

    // Intermittent missing pH — canteiro B
    const missingPh = edge === 'sensor-offline' && idx % 10 === 0;

    // Auto-irrigation when soil humidity < 35%
    const autoIrrig   = humSolo < 35 && edge !== 'manual-irrigation';
    const manualIrrig = idx === manualIrrigHour;

    data.push({
      id: idx,
      canteiro_id: canteiroId,
      timestamp: time.toISOString(),
      temperatura:       parseFloat(temp.toFixed(1)),
      temperatura_solo:  parseFloat(tempSolo.toFixed(1)),
      umidade:           parseFloat(hum.toFixed(1)),
      umidade_solo:      parseFloat(humSolo.toFixed(1)),
      luminosidade:      lux,
      PH_solo:           missingPh ? null : displayPh,
      status_bomba:      autoIrrig || manualIrrig,
      irrigacao_manual:  manualIrrig,
      status:            isSuspicious ? 'suspeito' : 'ok',
    });
  }

  return data;
};

export const MOCK_CANTEIRO_A = generateTelemetryForCanteiro('canteiro-a', 'normal');
export const MOCK_CANTEIRO_B = generateTelemetryForCanteiro('canteiro-b', 'sensor-offline');
export const MOCK_CANTEIRO_C = generateTelemetryForCanteiro('canteiro-c', 'manual-irrigation');
export const ALL_TELEMETRY   = [...MOCK_CANTEIRO_A, ...MOCK_CANTEIRO_B, ...MOCK_CANTEIRO_C];

// Backward-compat exports
export const generateRealisticData = () => MOCK_CANTEIRO_A;
export const MOCK_SUCCESS          = MOCK_CANTEIRO_A;
export const MOCK_OFFLINE          = MOCK_CANTEIRO_B.slice(-48);
