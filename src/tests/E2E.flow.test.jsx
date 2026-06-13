// src/tests/E2E.flow.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import * as telSvc  from '../features/telemetry/services/telemetryService.js';
import * as alertSvc from '../features/alertas/services/alertasService.js';
import * as histSvc  from '../features/historico/services/historicoService.js';
import * as cantSvc  from '../features/canteiros/services/canteirosService.js';
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
  Chart: { register: jest.fn() },
  CategoryScale: class {}, LinearScale: class {}, PointElement: class {},
  LineElement: class {}, BarElement: class {}, TimeScale: class {},
  Title: class {}, Tooltip: class {}, Legend: class {}, Filler: class {},
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

const CURRENT = { ...MOCK_CANTEIRO_A[MOCK_CANTEIRO_A.length - 1], status: 'ok' };
const ALERTAS = [
  { id: 'a-001', canteiro_id: 'canteiro-a', tipo: 'umidade_critica', severidade: 'aviso',
    mensagem: 'Umidade do solo abaixo de 35%.', timestamp: new Date().toISOString(), lido: false, automatico: true },
  { id: 'a-002', canteiro_id: 'canteiro-b', tipo: 'sensor_offline', severidade: 'critico',
    mensagem: 'Sensor offline há 6 horas.', timestamp: new Date().toISOString(), lido: false, automatico: true },
];
const HIST_ROWS = Array.from({ length: 5 }, (_, i) => ({
  id: i, canteiro_id: 'canteiro-a',
  timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
  temperatura: 24, temperatura_solo: 22, umidade: 70, umidade_solo: 45,
  luminosidade: 80000, PH_solo: 6.2, status_bomba: false, irrigacao_manual: false, status: 'ok',
}));

describe('E2E navigation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    telSvc.fetchCurrentTelemetry.mockResolvedValue(CURRENT);
    telSvc.fetchTelemetryHistory.mockResolvedValue(MOCK_CANTEIRO_A.slice(0, 5));
    telSvc.fetchWeeklyWaterReport.mockResolvedValue([
      { canteiro_id: 'canteiro-a', irrigacoes: 3, total_min: 3, estimativa_litros: 36 }
    ]);
    alertSvc.countUnreadAlertas.mockResolvedValue(2);
    alertSvc.fetchAlertas.mockResolvedValue({ items: ALERTAS, total: 2, page: 0, limit: 20 });
    alertSvc.markAlertaLido.mockResolvedValue({ success: true });
    histSvc.fetchHistorico.mockResolvedValue({ items: HIST_ROWS, total: 5, page: 0, limit: 9999, totalPages: 1 });
    histSvc.exportHistoricoCSV.mockResolvedValue(undefined);
    cantSvc.fetchCanteiros.mockResolvedValue([]);
  });

  test('fluxo: Principal → Alertas → marca lido → Histórico → exporta CSV', async () => {
    render(<App />);

    // 1. Principal carrega com cards de métricas
    await waitFor(() => {
      expect(screen.getByTestId('principal-page')).toBeInTheDocument();
      expect(screen.getByText(/sensor online/i)).toBeInTheDocument();
    });

    // 2. Badge de alertas não lidos na sidebar
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());

    // 3. Navega para Alertas
    fireEvent.click(screen.getByRole('button', { name: /alertas/i }));
    await waitFor(() => {
      expect(screen.getByTestId('alertas-page')).toBeInTheDocument();
      expect(screen.getByText(/umidade do solo abaixo de 35%/i)).toBeInTheDocument();
    });

    // 4. Marca alerta como lido
    const markBtns = screen.getAllByTitle(/marcar como lido/i);
    fireEvent.click(markBtns[0]);
    expect(alertSvc.markAlertaLido).toHaveBeenCalledWith('a-001');

    // 5. Navega para Histórico
    fireEvent.click(screen.getByRole('button', { name: /histórico/i }));
    await waitFor(() => {
      expect(screen.getByTestId('historico-page')).toBeInTheDocument();
      expect(screen.getAllByTestId('line-chart').length).toBeGreaterThanOrEqual(1);
    });

    // 6. Exporta CSV
    fireEvent.click(screen.getByText(/exportar csv/i));
    expect(histSvc.exportHistoricoCSV).toHaveBeenCalledTimes(1);
  });
});
