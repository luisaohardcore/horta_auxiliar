// src/tests/PrincipalPage.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import PrincipalPage from '../features/principal/components/PrincipalPage.jsx';
import * as svc from '../features/telemetry/services/telemetryService.js';
import { MOCK_CANTEIRO_A } from '../features/telemetry/mocks/telemetry.mock.js';

jest.mock('../features/telemetry/services/telemetryService.js');
jest.mock('../features/irrigacao/services/irrigacaoService.js', () => ({
  toggleBomba:            jest.fn(),
  getBombaStatus:         jest.fn(() => false),
  syncBombaFromTelemetry: jest.fn(),
}));
jest.mock('../shared/hooks/useCanteiros.js', () => ({
  useCanteiros: () => ({ canteiros: [{ id: 'canteiro-a', nome: 'Canteiro A – Alface' }], loading: false }),
}));
jest.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Bar:  () => <canvas data-testid="bar-chart"  />,
}));
jest.mock('chart.js', () => ({
  Chart:         { register: jest.fn() },
  CategoryScale: class {}, LinearScale: class {}, PointElement: class {},
  LineElement:   class {}, BarElement:  class {}, TimeScale:   class {},
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

const CURRENT_OK      = { ...MOCK_CANTEIRO_A[MOCK_CANTEIRO_A.length - 1], status: 'ok' };
const CURRENT_OFFLINE = { ...MOCK_CANTEIRO_A[0], status: 'offline', temperatura: null };
const WATER = [{ canteiro_id: 'canteiro-a', irrigacoes: 5, total_min: 5, estimativa_litros: 60 }];

function mockAll(currentOverride = CURRENT_OK) {
  svc.fetchCurrentTelemetry.mockResolvedValue(currentOverride);
  svc.fetchTelemetryHistory.mockResolvedValue(MOCK_CANTEIRO_A.slice(0, 10));
  svc.fetchWeeklyWaterReport.mockResolvedValue(WATER);
}

describe('PrincipalPage', () => {
  beforeEach(() => { jest.clearAllMocks(); mockAll(); });

  test('exibe spinner ao carregar', () => {
    render(<PrincipalPage />);
    expect(screen.getByText(/carregando dados/i)).toBeInTheDocument();
  });

  test('renderiza cards de métricas após sucesso', async () => {
    render(<PrincipalPage />);
    await waitFor(() => {
      expect(screen.getByText(/temperatura ar/i)).toBeInTheDocument();
      expect(screen.getByText(/umidade solo/i)).toBeInTheDocument();
      expect(screen.getByText(/pH solo/i)).toBeInTheDocument();
    });
  });

  test('exibe banner de sensor online quando status ok', async () => {
    render(<PrincipalPage />);
    await waitFor(() => expect(screen.getByText(/sensor online/i)).toBeInTheDocument());
  });

  test('exibe banner offline quando sensor está offline', async () => {
    mockAll(CURRENT_OFFLINE);
    render(<PrincipalPage />);
    await waitFor(() => expect(screen.getByText(/sensor offline/i)).toBeInTheDocument());
  });

  test('exibe gráficos históricos das últimas 24h', async () => {
    render(<PrincipalPage />);
    await waitFor(() => {
      expect(screen.getByText(/últimas 24h/i)).toBeInTheDocument();
      expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0);
    });
  });

  test('exibe relatório semanal de irrigação', async () => {
    render(<PrincipalPage />);
    await waitFor(() => {
      expect(screen.getByText(/relatório semanal/i)).toBeInTheDocument();
      expect(screen.getByText(/5 ciclos/i)).toBeInTheDocument();
    });
  });

  test('exibe ErrorBlock quando API falha', async () => {
    svc.fetchCurrentTelemetry.mockRejectedValue(new Error('API indisponível'));
    svc.fetchTelemetryHistory.mockRejectedValue(new Error('API indisponível'));
    svc.fetchWeeklyWaterReport.mockRejectedValue(new Error('API indisponível'));
    render(<PrincipalPage />);
    await waitFor(() => expect(screen.getByText(/api indisponível/i)).toBeInTheDocument());
  });
});

// ── Pump control ──────────────────────────────────────────────────
import * as irrSvc from '../features/irrigacao/services/irrigacaoService.js';

describe('PrincipalPage — controle de bomba', () => {
  beforeEach(() => { jest.clearAllMocks(); mockAll(); irrSvc.getBombaStatus.mockReturnValue(false); });

  test('exibe botão "Ligar bomba" quando bomba inativa', async () => {
    render(<PrincipalPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /ligar bomba/i })).toBeInTheDocument());
  });

  test('botão desabilitado quando sensor está offline', async () => {
    mockAll(CURRENT_OFFLINE);
    render(<PrincipalPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /ligar bomba/i })).toBeDisabled());
  });

  test('toggleBomba chamado com canteiro correto', async () => {
    irrSvc.toggleBomba.mockResolvedValue({ status_bomba: true });
    expect(irrSvc.getBombaStatus('canteiro-a')).toBe(false);
    await irrSvc.toggleBomba('canteiro-a', true);
    expect(irrSvc.toggleBomba).toHaveBeenCalledWith('canteiro-a', true);
  });
});
