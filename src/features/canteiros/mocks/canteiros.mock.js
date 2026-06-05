// src/features/canteiros/mocks/canteiros.mock.js

export const CANTEIROS_MOCK = [
  {
    id: 'canteiro-a',
    nome: 'Canteiro A – Alface',
    cultura: 'Alface Crespa',
    area_m2: 4.5,
    data_plantio: '2026-04-01',
    localizacao: 'Bloco Norte',
    status: 'ativo',
    umidade_critica: 35,
    notas: 'Irrigação automática configurada. Solo argiloso.',
  },
  {
    id: 'canteiro-b',
    nome: 'Canteiro B – Tomate',
    cultura: 'Tomate Cereja',
    area_m2: 6.0,
    data_plantio: '2026-03-15',
    localizacao: 'Bloco Sul',
    status: 'ativo',
    umidade_critica: 40,
    notas: 'Sensor de umidade com leituras instáveis desde 02/06.',
  },
  {
    id: 'canteiro-c',
    nome: 'Canteiro C – Manjericão',
    cultura: 'Manjericão Genovês',
    area_m2: 2.0,
    data_plantio: '2026-05-10',
    localizacao: 'Bloco Leste',
    status: 'inativo',
    umidade_critica: 45,
    notas: 'Temporariamente desativado para replantio.',
  },
];
