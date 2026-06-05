// src/tests/HistoricoPage.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HistoricoPage from '../features/historico/components/HistoricoPage.jsx';
import * as svc from '../features/historico/services/historicoService.js';

jest.mock('../features/historico/services/historicoService.js');

const makeRows = (n, overrides = {}) =>
  Array.from({ length: n }, (_, i) => ({
    id: i,
    canteiro_id: 'canteiro-a',
    timestamp: new Date(Date.now() - i * 3600_000).toISOString(),
    temperatura: 24.5, temperatura_solo: 22.0,
    umidade: 68.0, umidade_solo: 42.0,
    luminosidade: 80000, PH_solo: 6.2,
    status_bomba: false, irrigacao_manual: false,
    status: 'ok',
    ...overrides,
  }));

describe('HistoricoPage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('exibe spinner durante carregamento inicial', () => {
    svc.fetchHistorico.mockResolvedValue({ items: [], total: 0, page: 0, limit: 20, totalPages: 0 });
    render(<HistoricoPage />);
    // spinner inside table while rows are empty
    expect(screen.getByText(/carregando…/i)).toBeInTheDocument();
  });

  test('renderiza linhas da tabela após sucesso', async () => {
    const rows = makeRows(3);
    svc.fetchHistorico.mockResolvedValue({ items: rows, total: 3, page: 0, limit: 20, totalPages: 1 });
    render(<HistoricoPage />);
    await waitFor(() => {
      // 3 rows → 3 'CA' canteiro cells
      expect(screen.getAllByText('CA')).toHaveLength(3);
    });
  });

  test('mostra célula — para leituras nulas (sensor offline)', async () => {
    const rows = makeRows(1, { status: 'offline', temperatura: null, PH_solo: null });
    svc.fetchHistorico.mockResolvedValue({ items: rows, total: 1, page: 0, limit: 20, totalPages: 1 });
    render(<HistoricoPage />);
    await waitFor(() => {
      // Multiple — cells for null values
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  test('exibe badge "Manual" para irrigação manual', async () => {
    const rows = makeRows(1, { status_bomba: true, irrigacao_manual: true });
    svc.fetchHistorico.mockResolvedValue({ items: rows, total: 1, page: 0, limit: 20, totalPages: 1 });
    render(<HistoricoPage />);
    await waitFor(() => {
      expect(screen.getByText(/manual/i)).toBeInTheDocument();
    });
  });

  test('exibe paginação quando totalPages > 1', async () => {
    const rows = makeRows(20);
    svc.fetchHistorico.mockResolvedValue({ items: rows, total: 60, page: 0, limit: 20, totalPages: 3 });
    render(<HistoricoPage />);
    await waitFor(() => {
      expect(screen.getByText(/página 1 de 3/i)).toBeInTheDocument();
    });
  });

  test('chama exportHistoricoCSV ao clicar em Exportar CSV', async () => {
    svc.fetchHistorico.mockResolvedValue({ items: makeRows(2), total: 2, page: 0, limit: 20, totalPages: 1 });
    svc.exportHistoricoCSV.mockResolvedValue(undefined);
    render(<HistoricoPage />);
    await waitFor(() => expect(screen.getByText(/exportar csv/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/exportar csv/i));
    expect(svc.exportHistoricoCSV).toHaveBeenCalledTimes(1);
  });

  test('exibe estado de erro quando fetch falha', async () => {
    svc.fetchHistorico.mockRejectedValue(new Error('Timeout na conexão'));
    render(<HistoricoPage />);
    await waitFor(() => {
      expect(screen.getByText(/timeout na conexão/i)).toBeInTheDocument();
    });
  });
});
