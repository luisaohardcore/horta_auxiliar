// src/tests/AlertasPage.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AlertasPage from '../features/alertas/components/AlertasPage.jsx';
import * as svc from '../features/alertas/services/alertasService.js';

jest.mock('../features/alertas/services/alertasService.js');

const MOCK_ITEMS = [
  {
    id: 'a-001', canteiro_id: 'canteiro-a', tipo: 'umidade_critica',
    severidade: 'aviso', mensagem: 'Umidade abaixo de 35%.',
    timestamp: new Date().toISOString(), lido: false, automatico: true,
  },
  {
    id: 'a-002', canteiro_id: 'canteiro-b', tipo: 'sensor_offline',
    severidade: 'critico', mensagem: 'Sensor sem sinal há 6h.',
    timestamp: new Date().toISOString(), lido: false, automatico: true,
  },
];

describe('AlertasPage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('exibe spinner durante loading', () => {
    svc.fetchAlertas.mockResolvedValue({ items: [], total: 0, page: 0, limit: 10 });
    render(<AlertasPage />);
    expect(screen.getByText(/carregando alertas/i)).toBeInTheDocument();
  });

  test('renderiza lista de alertas com severidade', async () => {
    svc.fetchAlertas.mockResolvedValue({ items: MOCK_ITEMS, total: 2, page: 0, limit: 10 });
    render(<AlertasPage />);
    await waitFor(() => {
      expect(screen.getByText(/umidade abaixo de 35%/i)).toBeInTheDocument();
      expect(screen.getByText(/sensor sem sinal/i)).toBeInTheDocument();
    });
  });

  test('exibe badge de não lidos', async () => {
    svc.fetchAlertas.mockResolvedValue({ items: MOCK_ITEMS, total: 2, page: 0, limit: 10 });
    render(<AlertasPage />);
    await waitFor(() => {
      expect(screen.getByText(/2 não lidos/i)).toBeInTheDocument();
    });
  });

  test('marcar como lido remove badge do item', async () => {
    svc.fetchAlertas.mockResolvedValue({ items: MOCK_ITEMS, total: 2, page: 0, limit: 10 });
    svc.markAlertaLido.mockResolvedValue({ success: true });
    render(<AlertasPage />);
    await waitFor(() => expect(screen.getByText(/umidade abaixo de 35%/i)).toBeInTheDocument());
    const checkBtns = screen.getAllByTitle(/marcar como lido/i);
    fireEvent.click(checkBtns[0]);
    expect(svc.markAlertaLido).toHaveBeenCalledWith('a-001');
  });

  test('exibe estado de erro quando fetch falha', async () => {
    svc.fetchAlertas.mockRejectedValue(new Error('API indisponível'));
    render(<AlertasPage />);
    await waitFor(() => {
      expect(screen.getByText(/api indisponível/i)).toBeInTheDocument();
    });
  });

  test('exibe empty state quando sem alertas', async () => {
    svc.fetchAlertas.mockResolvedValue({ items: [], total: 0, page: 0, limit: 10 });
    render(<AlertasPage />);
    await waitFor(() => {
      expect(screen.getByText(/nenhum alerta para os filtros/i)).toBeInTheDocument();
    });
  });
});
