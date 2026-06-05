// src/tests/E2E.flow.test.jsx
/**
 * E2E integration test (RTL, no browser).
 * Flow: user loads app → sees Principal → navigates to Alertas →
 *       sees unread count → navigates to Histórico → exports CSV.
 *
 * All services mocked at module boundary; no real network calls.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import App from '../App.jsx';
import * as telSvc from '../features/telemetry/services/telemetryService.js';
import * as alertSvc from '../features/alertas/services/alertasService.js';
import * as histSvc from '../features/historico/services/historicoService.js';
import * as cantSvc from '../features/canteiros/services/canteirosService.js';
import { MOCK_CANTEIRO_A } from '../features/telemetry/mocks/telemetry.mock.js';

jest.mock('../features/telemetry/services/telemetryService.js');
jest.mock('../features/alertas/services/alertasService.js');
jest.mock('../features/historico/services/historicoService.js');
jest.mock('../features/canteiros/services/canteirosService.js');
jest.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Bar:  () => <canvas data-testid="bar-chart"  />,
}));
jest.mock('chart.js', () => ({
  Chart:         { register: jest.fn() },
  CategoryScale: class {}, LinearScale: class {}, PointElement: class {},
  LineElement: class {}, BarElement: class {}, TimeScale: class {},
  Title: class {}, Tooltip: class {}, Legend: class {}, Filler: class {}, BarElement: class {},
}));
jest.mock('chartjs-adapter-date-fns', () => ({}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(q => ({
      matches: false, media: q, onchange: null,
      addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
    })),
  });
});

const CURRENT = MOCK_CANTEIRO_A[MOCK_CANTEIRO_A.length - 1];
const WATER   = [{ canteiro_id: 'canteiro-a', irrigacoes: 3, total_min: 3, estimativa_litros: 36 }];

const ALERTAS = [
  {
    id: 'a-001', canteiro_id: 'canteiro-a', tipo: 'umidade_critica',
    severidade: 'aviso', mensagem: 'Umidade do solo abaixo de 35%.',
    timestamp: new Date().toISOString(), lido: false, automatico: true,
  },
  {
    id: 'a-002', canteiro_id: 'canteiro-b', tipo: 'sensor_offline',
    severidade: 'critico', mensagem: 'Sensor offline há 6 horas.',
    timestamp: new Date().toISOString(), lido: false, automatico: true,
  },
];

const HIST_ROWS = Array.from({ length: 5 }, (_, i) => ({
  id: i, canteiro_id: 'canteiro-a',
  timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
  temperatura: 24, temperatura_solo: 22, umidade: 70, umidade_solo: 45,
  luminosidade: 80000, PH_solo: 6.2, status_bomba: false,
  irrigacao_manual: false, status: 'ok',
}));

describe('E2E navigation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Principal
    telSvc.fetchTelemetryHistory.mockResolvedValue(MOCK_CANTEIRO_A);
    telSvc.fetchCurrentTelemetry.mockResolvedValue(CURRENT);
    telSvc.fetchWeeklyWaterReport.mockResolvedValue(WATER);

    // Alertas
    alertSvc.countUnreadAlertas.mockResolvedValue(2);
    alertSvc.fetchAlertas.mockResolvedValue({ items: ALERTAS, total: 2, page: 0, limit: 10 });
    alertSvc.markAlertaLido.mockResolvedValue({ success: true });

    // Histórico
    histSvc.fetchHistorico.mockResolvedValue({
      items: HIST_ROWS, total: 5, page: 0, limit: 20, totalPages: 1,
    });
    histSvc.exportHistoricoCSV.mockResolvedValue(undefined);

    // Canteiros
    cantSvc.fetchCanteiros.mockResolvedValue([]);
  });

  test('fluxo completo: Principal → Alertas → marca lido → Histórico → exporta CSV', async () => {
    render(<App />);

    // ── 1. Principal carrega ─────────────────────────────────────────
    await waitFor(() => {
      expect(screen.getByTestId('principal-page')).toBeInTheDocument();
    });
    expect(screen.getByText(/relatório semanal/i)).toBeInTheDocument();

    // ── 2. Sidebar mostra badge de alertas não lidos ──────────────────
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // badge count
    });

    // ── 3. Navega para Alertas ────────────────────────────────────────
    fireEvent.click(screen.getByRole('button', { name: /alertas/i }));
    await waitFor(() => {
      expect(screen.getByTestId('alertas-page')).toBeInTheDocument();
      expect(screen.getByText(/umidade do solo abaixo de 35%/i)).toBeInTheDocument();
      expect(screen.getByText(/sensor offline há 6 horas/i)).toBeInTheDocument();
    });

    // ── 4. Marca primeiro alerta como lido ────────────────────────────
    const markBtns = screen.getAllByTitle(/marcar como lido/i);
    fireEvent.click(markBtns[0]);
    expect(alertSvc.markAlertaLido).toHaveBeenCalledWith('a-001');

    // ── 5. Navega para Histórico ──────────────────────────────────────
    fireEvent.click(screen.getByRole('button', { name: /histórico/i }));
    await waitFor(() => {
      expect(screen.getByTestId('historico-page')).toBeInTheDocument();
      // Expects rows rendered
      expect(screen.getAllByText('CA').length).toBeGreaterThan(0);
    });

    // ── 6. Exporta CSV ────────────────────────────────────────────────
    fireEvent.click(screen.getByText(/exportar csv/i));
    expect(histSvc.exportHistoricoCSV).toHaveBeenCalledTimes(1);
  });
});
