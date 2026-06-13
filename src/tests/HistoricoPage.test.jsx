// src/tests/HistoricoPage.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HistoricoPage from '../features/historico/components/HistoricoPage.jsx';
import * as svc from '../features/historico/services/historicoService.js';

jest.mock('../features/historico/services/historicoService.js');
jest.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
}));
jest.mock('chart.js', () => ({
  Chart:         { register: jest.fn() },
  CategoryScale: class {}, LinearScale: class {}, PointElement: class {},
  LineElement: class {}, TimeScale: class {}, Title: class {},
  Tooltip: class {}, Legend: class {}, Filler: class {},
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

const makeRows = (n, overrides = {}) =>
  Array.from({ length: n }, (_, i) => ({
    id: i, canteiro_id: 'canteiro-a',
    timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
    temperatura: 24.5, temperatura_solo: 22.0, umidade: 68.0, umidade_solo: 42.0,
    luminosidade: 80000, PH_solo: 6.2, status_bomba: false, irrigacao_manual: false,
    status: 'ok', ...overrides,
  }));

describe('HistoricoPage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('exibe spinner durante carregamento', () => {
    svc.fetchHistorico.mockResolvedValue({ items: [], total: 0, page: 0, limit: 9999, totalPages: 0 });
    render(<HistoricoPage />);
    expect(screen.getByText(/carregando histórico/i)).toBeInTheDocument();
  });

  test('renderiza gráficos após carregar dados', async () => {
    svc.fetchHistorico.mockResolvedValue({ items: makeRows(10), total: 10, page: 0, limit: 9999, totalPages: 1 });
    render(<HistoricoPage />);
    await waitFor(() => {
      expect(screen.getAllByTestId('line-chart').length).toBeGreaterThanOrEqual(4);
    });
  });

  test('exibe títulos dos 4 gráficos', async () => {
    svc.fetchHistorico.mockResolvedValue({ items: makeRows(5), total: 5, page: 0, limit: 9999, totalPages: 1 });
    render(<HistoricoPage />);
    await waitFor(() => {
      expect(screen.getByText(/🌡️ temperatura/i)).toBeInTheDocument();
      expect(screen.getByText(/💧 umidade/i)).toBeInTheDocument();
      expect(screen.getByText(/☀️ luminosidade/i)).toBeInTheDocument();
      expect(screen.getByText(/🧪 pH/i)).toBeInTheDocument();
    });
  });

  test('exibe estatísticas de resumo (mín/méd/máx)', async () => {
    svc.fetchHistorico.mockResolvedValue({ items: makeRows(5), total: 5, page: 0, limit: 9999, totalPages: 1 });
    render(<HistoricoPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/méd/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/máx/i).length).toBeGreaterThan(0);
    });
  });

  test('exibe empty state quando não há leituras válidas', async () => {
    const offlineRows = makeRows(3, { status: 'offline' });
    svc.fetchHistorico.mockResolvedValue({ items: offlineRows, total: 3, page: 0, limit: 9999, totalPages: 1 });
    render(<HistoricoPage />);
    await waitFor(() => {
      expect(screen.getByText(/sem leituras válidas/i)).toBeInTheDocument();
    });
  });

  test('chama exportHistoricoCSV ao clicar em Exportar CSV', async () => {
    svc.fetchHistorico.mockResolvedValue({ items: makeRows(3), total: 3, page: 0, limit: 9999, totalPages: 1 });
    svc.exportHistoricoCSV.mockResolvedValue(undefined);
    render(<HistoricoPage />);
    await waitFor(() => expect(screen.getByText(/exportar csv/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/exportar csv/i));
    expect(svc.exportHistoricoCSV).toHaveBeenCalledTimes(1);
  });

  test('exibe ErrorBlock quando fetch falha', async () => {
    svc.fetchHistorico.mockRejectedValue(new Error('Timeout na conexão'));
    render(<HistoricoPage />);
    await waitFor(() => {
      expect(screen.getByText(/timeout na conexão/i)).toBeInTheDocument();
    });
  });
});
