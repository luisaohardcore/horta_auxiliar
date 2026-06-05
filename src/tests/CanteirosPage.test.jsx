// src/tests/CanteirosPage.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CanteirosPage from '../features/canteiros/components/CanteirosPage.jsx';
import * as svc from '../features/canteiros/services/canteirosService.js';

jest.mock('../features/canteiros/services/canteirosService.js');

const MOCK_CANTEIROS = [
  {
    id: 'canteiro-a', nome: 'Canteiro A – Alface', cultura: 'Alface Crespa',
    area_m2: 4.5, data_plantio: '2026-04-01', localizacao: 'Bloco Norte',
    status: 'ativo', umidade_critica: 35, notas: '',
  },
];

describe('CanteirosPage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('exibe spinner ao carregar', () => {
    svc.fetchCanteiros.mockResolvedValue(MOCK_CANTEIROS);
    render(<CanteirosPage />);
    expect(screen.getByText(/carregando canteiros/i)).toBeInTheDocument();
  });

  test('renderiza card de canteiro após carregamento', async () => {
    svc.fetchCanteiros.mockResolvedValue(MOCK_CANTEIROS);
    render(<CanteirosPage />);
    await waitFor(() => {
      expect(screen.getByText('Canteiro A – Alface')).toBeInTheDocument();
      expect(screen.getByText('Alface Crespa')).toBeInTheDocument();
    });
  });

  test('botão "Novo canteiro" abre modal', async () => {
    svc.fetchCanteiros.mockResolvedValue(MOCK_CANTEIROS);
    render(<CanteirosPage />);
    await waitFor(() => expect(screen.getByText(/novo canteiro/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/novo canteiro/i));
    expect(screen.getByText(/novo canteiro/i, { selector: 'h2' })).toBeInTheDocument();
  });

  test('exibe erro de validação quando nome está vazio', async () => {
    svc.fetchCanteiros.mockResolvedValue(MOCK_CANTEIROS);
    svc.createCanteiro.mockRejectedValue({ validationErrors: { nome: 'Nome é obrigatório.' } });
    render(<CanteirosPage />);
    await waitFor(() => fireEvent.click(screen.getByText(/novo canteiro/i)));
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
    });
  });

  test('botão Editar abre modal preenchido', async () => {
    svc.fetchCanteiros.mockResolvedValue(MOCK_CANTEIROS);
    render(<CanteirosPage />);
    await waitFor(() => expect(screen.getByText('Canteiro A – Alface')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/editar/i));
    expect(screen.getByText(/editar canteiro/i)).toBeInTheDocument();
    // Nome pré-preenchido no input
    const input = screen.getByDisplayValue('Canteiro A – Alface');
    expect(input).toBeInTheDocument();
  });

  test('confirmar exclusão chama deleteCanteiro', async () => {
    svc.fetchCanteiros.mockResolvedValue(MOCK_CANTEIROS);
    svc.deleteCanteiro.mockResolvedValue({ success: true });
    render(<CanteirosPage />);
    await waitFor(() => expect(screen.getByText(/excluir/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/excluir/i));
    await waitFor(() => expect(screen.getByText(/esta ação não pode ser desfeita/i)).toBeInTheDocument());
    // The confirm dialog has exactly one red "Excluir" button; pick the last one
    const allExcluir = screen.getAllByRole('button', { name: /^excluir$/i });
    fireEvent.click(allExcluir[allExcluir.length - 1]);
    await waitFor(() => expect(svc.deleteCanteiro).toHaveBeenCalledWith('canteiro-a'));
  });

  test('exibe erro quando fetch falha', async () => {
    svc.fetchCanteiros.mockRejectedValue(new Error('Sem conexão com o servidor'));
    render(<CanteirosPage />);
    await waitFor(() => {
      expect(screen.getByText(/sem conexão com o servidor/i)).toBeInTheDocument();
    });
  });
});
