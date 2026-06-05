import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HistoryChart from '../features/telemetry/components/HistoryChart.jsx';
import { fetchTelemetryHistory, fetchCurrentTelemetry } from '../features/telemetry/services/telemetryService.js';
import { MOCK_SUCCESS } from '../features/telemetry/mocks/telemetry.mock.js';

jest.mock('../features/telemetry/services/telemetryService.js');
jest.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Bar:  () => <canvas data-testid="bar-chart" />,
}));
jest.mock('chart.js', () => ({
  Chart:         { register: jest.fn() },
  CategoryScale: class {}, LinearScale: class {}, PointElement: class {},
  LineElement: class {}, BarElement: class {}, TimeScale: class {},
  Title: class {}, Tooltip: class {}, Legend: class {}, Filler: class {},
}));
jest.mock('chartjs-adapter-date-fns', () => ({}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false, media: query, onchange: null,
      addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
    })),
  });
});

const MOCK_CURRENT = MOCK_SUCCESS[MOCK_SUCCESS.length - 1];

describe('HistoryChart (legacy)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('mostra spinner durante loading', () => {
    fetchTelemetryHistory.mockResolvedValue(MOCK_SUCCESS);
    fetchCurrentTelemetry.mockResolvedValue(MOCK_CURRENT);
    render(<HistoryChart activeTab="tempo-real" />);
    expect(screen.getByText(/conectando à api da horta/i)).toBeInTheDocument();
  });

  test('mostra erro quando API falha', async () => {
    fetchTelemetryHistory.mockRejectedValue(new Error('Falha'));
    fetchCurrentTelemetry.mockRejectedValue(new Error('Falha'));
    render(<HistoryChart activeTab="tempo-real" />);
    await waitFor(() => {
      expect(screen.getByText(/falha na sincronização/i)).toBeInTheDocument();
    });
  });

  test('mostra empty state para resposta com campo erro', async () => {
    fetchTelemetryHistory.mockResolvedValue({ erro: 'sem dados' });
    fetchCurrentTelemetry.mockResolvedValue({ erro: 'sem dados' });
    render(<HistoryChart activeTab="tempo-real" />);
    await waitFor(() => {
      expect(screen.getByText(/aguardando primeira leitura/i)).toBeInTheDocument();
    });
  });

  test('renderiza dashboard após sucesso', async () => {
    fetchTelemetryHistory.mockResolvedValue(MOCK_SUCCESS);
    fetchCurrentTelemetry.mockResolvedValue(MOCK_CURRENT);
    render(<HistoryChart activeTab="tempo-real" />);
    await waitFor(() => {
      expect(screen.getByText(/status do sistema de irrigação/i)).toBeInTheDocument();
    });
  });

  test('botão "Tentar Novamente" re-dispara fetch', async () => {
    fetchTelemetryHistory
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(MOCK_SUCCESS);
    fetchCurrentTelemetry
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(MOCK_CURRENT);
    render(<HistoryChart activeTab="tempo-real" />);
    await waitFor(() => expect(screen.getByText(/tentar novamente/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/tentar novamente/i));
    await waitFor(() => expect(fetchTelemetryHistory).toHaveBeenCalledTimes(2));
  });
});
