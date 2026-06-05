# HortaSmart Dashboard

Dashboard de monitoramento da Horta Comunitária Inteligente.  
**v0.2.0-dashboard-rc** — Release 2 (A1.8)

## Pré-requisitos

- Node.js LTS (≥ 20)
- npm ≥ 9

## Instalação e execução

```bash
git clone https://github.com/luisaohardcore/horta_auxiliar.git
cd horta_auxiliar
npm install
npm run dev        # http://localhost:5173
```

Sem `.env` necessário — dados mockados por padrão.

### Apontar para API real

```bash
VITE_API_URL=https://sua-api.com npm run dev
```

## Testes

```bash
npm test           # 31 testes (6 suites)
```

## Telas disponíveis

| Tela | Rota (tab) | Descrição |
|---|---|---|
| Principal | `principal` | Gráficos tempo/umidade/luz + status atual + relatório semanal de irrigação |
| Alertas | `alertas` | Lista filtrada de alertas com marcar lido |
| Histórico | `historico` | Tabela paginada de leituras + exportação CSV |
| Canteiros | `canteiros` | CRUD completo com validação |

## Documentação

- `docs/releases/release-2.md` — Release notes detalhadas
- `docs/dashboard/threat-model.md` — Modelo de ameaças do front-end
- `docs/ops/observability-dashboard.md` — Logs, métricas e runbook
- `docs/dashboard/evidencias/` — Evidências de testes e npm audit
