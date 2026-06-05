# Release Notes — v0.2.0-dashboard-rc

**Tag:** `v0.2.0-dashboard-rc`  
**Data:** 2026-06-05  
**Tipo:** Release Candidate (A1.8)

---

## 1. Resumo

Esta release entrega o dashboard completo E2E com as 3 telas restantes além da tela de Histórico já entregue na Release 1. Inclui sistema de alertas funcional, relatório semanal de irrigação, CRUD de canteiros com validação, camada de observabilidade instrumentada e threat model do front-end.

---

## 2. O que entrou desde a Release 1

### 2.1 Novas Telas

| Tela | Componente | Serviço | Mock |
|---|---|---|---|
| Principal (gráficos + status + relatório) | `PrincipalPage.jsx` | `telemetryService.js` (estendido) | `telemetry.mock.js` (estendido) |
| Alertas (lista filtrada + marcar lido) | `AlertasPage.jsx` | `alertasService.js` | `alertas.mock.js` |
| Histórico (tabela paginada + exportar CSV) | `HistoricoPage.jsx` | `historicoService.js` | `telemetry.mock.js` |
| Cadastro de Canteiros (CRUD + validação) | `CanteirosPage.jsx` | `canteirosService.js` | `canteiros.mock.js` |

### 2.2 Infraestrutura

- **`src/shared/utils/logger.js`** — logger estruturado JSON + coleta de métricas in-memory (`fetch_errors`, `avg_fetch_ms`, `render_times`, `alerts_displayed`).
- **`src/App.jsx`** — reescrito com navegação de 4 abas via sidebar responsiva + badge de alertas não lidos.
- **`babel.config.cjs` + `jest.config.cjs`** — configuração de testes corrigida para ESM/Vite com plugin Babel para `import.meta.env`.

### 2.3 Mock Data Estendido

- 3 canteiros com 7 dias × 24h de dados cada.
- Cenários cobertos: sensor offline (Canteiro B), irrigação manual (Canteiro C), leitura suspeita de pH (Canteiro A, dia 3), dado parcial (pH null em intervalos), irrigação automática por umidade < 35%.

### 2.4 Sistema de Alertas

- 8 alertas mockados cobrindo todos os tipos: `umidade_critica`, `temperatura_alta`, `sensor_offline`, `dado_parcial`, `irrigacao_manual`, `irrigacao_concluida`, `ph_anomalo`.
- Filtros por canteiro, tipo, severidade e período.
- Badge de não lidos na sidebar.
- Ação "marcar como lido" atualiza estado local + persiste no serviço.

### 2.5 Relatório Semanal

- Seção na PrincipalPage: gráfico de barras + tabela de irrigações por canteiro na semana.
- Estimativa de litros consumidos (12 L/min × ciclos ativos).

### 2.6 Documentação

- `docs/dashboard/threat-model.md` — 5 ameaças modeladas (XSS, TLS, credenciais, injeção, CSRF).
- `docs/ops/observability-dashboard.md` — logs estruturados, métricas, runbook de produção.
- `docs/dashboard/evidencias/` — logs de testes, logs estruturados capturados, resultado de npm audit.

### 2.7 Testes

- **31 testes passando** (6 suites).
- 1 teste por comportamento real em cada tela (não apenas render).
- 1 teste E2E de navegação completa: Principal → Alertas → marca lido → Histórico → exporta CSV.
- Correção do bug `loadAllData(True)` no componente legado `HistoryChart.jsx`.

---

## 3. Breaking Changes e Migração

| Item | Tipo | Migração necessária |
|---|---|---|
| `telemetry.mock.js` — API alterada | Breaking | Substituído por `MOCK_CANTEIRO_A/B/C` e `ALL_TELEMETRY`. Exports legados `MOCK_SUCCESS`, `MOCK_OFFLINE`, `generateRealisticData` mantidos para backward compat com testes da Release 1. |
| `telemetryService.js` — assinatura alterada | Breaking | `fetchTelemetryHistory(canteiroId, days)` e `fetchCurrentTelemetry(canteiroId)` agora aceitam `canteiroId`. Calls sem argumento continuam funcionando (default `'canteiro-a'`). |
| `jest.config.js` → `jest.config.cjs` | Config | Script `npm test` atualizado. Nenhuma ação manual necessária. |
| `babel.config.cjs` adicionado | Config | Substitui `.babelrc`. Nenhuma ação manual necessária. |

---

## 4. Rastreabilidade E2E

| UC | Tela | Componente | Teste | Evidência |
|---|---|---|---|---|
| UC-03 (Comando Remoto) | Principal | `PrincipalPage.jsx` | `PrincipalPage.test.jsx` (5 testes) | `test-run-20260605.log` |
| RF-004 (Dashboard Histórico) | Histórico | `HistoricoPage.jsx` | `HistoricoPage.test.jsx` (7 testes) | `test-run-20260605.log` |
| — (Alertas) | Alertas | `AlertasPage.jsx` | `AlertasPage.test.jsx` (6 testes) | `test-run-20260605.log` |
| — (CRUD canteiros) | Canteiros | `CanteirosPage.jsx` | `CanteirosPage.test.jsx` (7 testes) | `test-run-20260605.log` |
| — (Fluxo navegação E2E) | Todas | `App.jsx` | `E2E.flow.test.jsx` (1 teste) | `test-run-20260605.log` |
| UC-02 (Irrigação / sensor offline) | Principal + Histórico | Mock edge cases | `PrincipalPage.test.jsx` (banner offline) | `test-run-20260605.log` |

---

## 5. Como rodar localmente

```bash
git clone https://github.com/luisaohardcore/horta_auxiliar.git
cd horta_auxiliar
npm install
npm run dev       # http://localhost:5173
npm test          # 31 testes
```

Sem `.env` necessário — todos os dados são mockados por padrão.  
Para apontar para API real: `VITE_API_URL=https://sua-api.com npm run dev`

---

## 6. Issues fechadas nesta release

- BUG: `loadAllData(True)` — `True` não existe em JS → corrigido para `true`
- BUG: `import.meta.env` incompatível com Jest/Babel CJS → resolvido via plugin Babel inline
- FEAT: Tela Principal com gráficos e relatório semanal
- FEAT: Tela de Alertas com filtros
- FEAT: Tela de Histórico com paginação e exportação CSV
- FEAT: Tela de Cadastro de Canteiros com CRUD e validação
- FEAT: Logger estruturado + métricas
- FEAT: Threat model do dashboard
- FEAT: Runbook de observabilidade
