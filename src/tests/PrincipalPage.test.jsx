// src/tests/PrincipalPage.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PrincipalPage from '../features/principal/components/PrincipalPage.jsx';
import * as svc from '../features/telemetry/services/telemetryService.js';
import { MOCK_CANTEIRO_A } from '../features/telemetry/mocks/telemetry.mock.js';

jest.mock('../features/telemetry/services/telemetryService.js');
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
const WATER   = [{ canteiro_id: 'canteiro-a', irrigacoes: 5, total_min: 5, estimativa_litros: 60 }];

describe('PrincipalPage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('exibe spinner ao carregar', () => {
    svc.fetchTelemetryHistory.mockResolvedValue(MOCK_CANTEIRO_A);
    svc.fetchCurrentTelemetry.mockResolvedValue(CURRENT);
    svc.fetchWeeklyWaterReport.mockResolvedValue(WATER);
    render(<PrincipalPage />);
    expect(screen.getByText(/carregando dados do canteiro/i)).toBeInTheDocument();
  });

  test('renderiza cards de métricas após sucesso', async () => {
    svc.fetchTelemetryHistory.mockResolvedValue(MOCK_CANTEIRO_A);
    svc.fetchCurrentTelemetry.mockResolvedValue(CURRENT);
    svc.fetchWeeklyWaterReport.mockResolvedValue(WATER);
    render(<PrincipalPage />);
    await waitFor(() => {
      expect(screen.getByText(/temp\. ar/i)).toBeInTheDocument();
      expect(screen.getByText(/umid\. solo/i)).toBeInTheDocument();
    });
  });

  test('exibe relatório semanal de irrigação', async () => {
    svc.fetchTelemetryHistory.mockResolvedValue(MOCK_CANTEIRO_A);
    svc.fetchCurrentTelemetry.mockResolvedValue(CURRENT);
    svc.fetchWeeklyWaterReport.mockResolvedValue(WATER);
    render(<PrincipalPage />);
    await waitFor(() => {
      expect(screen.getByText(/relatório semanal/i)).toBeInTheDocument();
    });
  });

  test('exibe mensagem de erro quando API falha', async () => {
    svc.fetchTelemetryHistory.mockRejectedValue(new Error('API offline'));
    svc.fetchCurrentTelemetry.mockRejectedValue(new Error('API offline'));
    svc.fetchWeeklyWaterReport.mockRejectedValue(new Error('API offline'));
    render(<PrincipalPage />);
    await waitFor(() => {
      expect(screen.getByText(/api offline/i)).toBeInTheDocument();
    });
  });

  test('exibe banner quando há sensor offline no histórico', async () => {
    const withOffline = [
      ...MOCK_CANTEIRO_A.slice(0, 5),
      { ...MOCK_CANTEIRO_A[5], status: 'offline', temperatura: null },
    ];
    svc.fetchTelemetryHistory.mockResolvedValue(withOffline);
    svc.fetchCurrentTelemetry.mockResolvedValue(CURRENT);
    svc.fetchWeeklyWaterReport.mockResolvedValue(WATER);
    render(<PrincipalPage />);
    await waitFor(() => {
      expect(screen.getByText(/sensor offline detectado/i)).toBeInTheDocument();
    });
  });
});
