// src/features/canteiros/services/canteirosService.js
import { CANTEIROS_MOCK } from '../mocks/canteiros.mock.js';
import { logger } from '../../../shared/utils/logger.js';

const USE_MOCK = !import.meta.env.VITE_API_URL || import.meta.env.VITE_USE_MOCK === 'true';
let _store = [...CANTEIROS_MOCK];
let _nextId = 10;

function slug(nome) {
  return `canteiro-${++_nextId}`;
}

export const fetchCanteiros = async () => {
  logger.info('canteirosService', 'fetch_canteiros');
  if (USE_MOCK) return [..._store];
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros`);
  if (!res.ok) throw new Error('Falha ao buscar canteiros.');
  return res.json();
};

export const fetchCanteiro = async (id) => {
  logger.info('canteirosService', 'fetch_canteiro', { id });
  if (USE_MOCK) {
    const c = _store.find(x => x.id === id);
    if (!c) throw new Error(`Canteiro ${id} não encontrado.`);
    return c;
  }
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros/${id}`);
  if (!res.ok) throw new Error('Falha ao buscar canteiro.');
  return res.json();
};

export const createCanteiro = async (payload) => {
  logger.info('canteirosService', 'create_canteiro', { nome: payload.nome });
  validate(payload);
  if (USE_MOCK) {
    const novo = { ...payload, id: slug(payload.nome), status: payload.status ?? 'ativo' };
    _store.push(novo);
    return novo;
  }
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao criar canteiro.');
  return res.json();
};

export const updateCanteiro = async (id, payload) => {
  logger.info('canteirosService', 'update_canteiro', { id });
  validate(payload);
  if (USE_MOCK) {
    const idx = _store.findIndex(x => x.id === id);
    if (idx === -1) throw new Error(`Canteiro ${id} não encontrado.`);
    _store[idx] = { ..._store[idx], ...payload };
    return _store[idx];
  }
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao atualizar canteiro.');
  return res.json();
};

export const deleteCanteiro = async (id) => {
  logger.info('canteirosService', 'delete_canteiro', { id });
  if (USE_MOCK) {
    _store = _store.filter(x => x.id !== id);
    return { success: true };
  }
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/canteiros/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Falha ao excluir canteiro.');
  return res.json();
};

function validate(p) {
  const errors = {};
  if (!p.nome?.trim())           errors.nome           = 'Nome é obrigatório.';
  if (!p.cultura?.trim())        errors.cultura        = 'Cultura é obrigatória.';
  if (!p.area_m2 || p.area_m2 <= 0) errors.area_m2    = 'Área deve ser maior que 0.';
  if (!p.data_plantio)           errors.data_plantio   = 'Data de plantio é obrigatória.';
  if (!p.umidade_critica || p.umidade_critica < 10 || p.umidade_critica > 90)
    errors.umidade_critica = 'Limiar de umidade deve estar entre 10 e 90%.';
  if (Object.keys(errors).length) throw { validationErrors: errors };
}
