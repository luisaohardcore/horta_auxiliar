# Observabilidade — Dashboard HortaSmart

**Versão:** 1.0 (A1.8 / Release 2)  
**Data:** 2026-06-05

---

## 1. Logs Estruturados

### Implementação

O módulo `src/shared/utils/logger.js` emite todas as mensagens como JSON minificado no `console` do navegador, com os campos:

```json
{
  "level":     "INFO | WARN | ERROR | DEBUG",
  "ts":        "2026-06-05T18:07:52.881Z",
  "requestId": "req-1749146872881-a3f2c",
  "component": "AlertasPage",
  "message":   "loaded",
  "total":     8,
  "page":      0
}
```

**Correlação de request:** `generateRequestId()` gera um ID por fetch; o mesmo ID aparece nos logs `fetch_start`, `fetch_ok`/`fetch_error`, permitindo rastrear uma operação ponta-a-ponta no console.

### Evidência (capturada durante execução de testes)

```
{"level":"INFO","ts":"2026-06-05T18:07:52.881Z","requestId":null,"component":"App","message":"app_started"}
{"level":"INFO","ts":"2026-06-05T18:07:52.888Z","requestId":null,"component":"PrincipalPage","message":"data_loaded","canteiro":"canteiro-a","points":169}
{"level":"INFO","ts":"2026-06-05T18:07:52.889Z","requestId":null,"component":"metrics","message":"render_time","page":"principal","ms":8,"avg_ms":8}
{"level":"INFO","ts":"2026-06-05T18:07:53.018Z","requestId":null,"component":"metrics","message":"alerts_displayed","count":2,"total":2}
{"level":"INFO","ts":"2026-06-05T18:07:53.018Z","requestId":null,"component":"AlertasPage","message":"loaded","total":2,"page":0}
{"level":"INFO","ts":"2026-06-05T18:07:53.100Z","requestId":null,"component":"AlertasPage","message":"mark_lido","id":"a-001"}
{"level":"INFO","ts":"2026-06-05T18:07:53.101Z","requestId":null,"component":"HistoricoPage","message":"loaded","total":5,"page":0}
{"level":"ERROR","ts":"2026-06-05T18:07:50.182Z","requestId":null,"component":"PrincipalPage","message":"API offline"}
{"level":"INFO","ts":"2026-06-05T18:07:50.086Z","requestId":null,"component":"metrics","message":"render_time","page":"principal","ms":19,"avg_ms":19}
```

Arquivo completo: `docs/dashboard/evidencias/structured-logs-20260605.log`

---

## 2. Métricas Capturadas

### Implementação

O objeto `metrics` em `logger.js` mantém um store in-memory acessível via:

```js
window.__horta_metrics__  // DevTools Console
```

**Métricas disponíveis:**

| Métrica | Descrição | Exemplo de log |
|---|---|---|
| `fetch_calls` | Total de chamadas fetch disparadas | — |
| `fetch_errors` | Contagem de erros de fetch | `"component":"metrics","message":"fetch_recorded","success":false` |
| `avg_fetch_ms` | Latência média de fetch (ms) | `"avg_ms":8` |
| `alerts_displayed` | Total de alertas renderizados na sessão | `"message":"alerts_displayed","count":2,"total":4` |
| `render_times.principal` | Histórico de tempos de render da PrincipalPage | `"message":"render_time","page":"principal","ms":8` |

### Evidência de métrica capturada

Durante o teste E2E `fluxo completo` (334 ms):
```
render_time  → page: principal, ms: 8, avg_ms: 8
alerts_displayed → count: 2, total: 2
loaded → HistoricoPage, total: 5, page: 0
```

---

## 3. Runbook — Dashboard em Erro Persistente em Produção

### Sintoma: Dashboard mostra tela de erro em todas as páginas

**Passo 1 — Verificar console do navegador**
```
F12 → Console → filtrar por level:"ERROR"
```
Campos relevantes: `component`, `message`, `url`. Identifica qual serviço falhou e qual endpoint.

**Passo 2 — Verificar conectividade com a API**
```bash
curl -I https://<VITE_API_URL>/api/v1/telemetria/atual
# Esperado: 200 OK ou 401 Unauthorized
# Problema: timeout, 502, 503 → backend indisponível
```

**Passo 3 — Verificar variáveis de ambiente do deploy**
```bash
# No servidor de hospedagem (ex: Vercel, Netlify)
echo $VITE_API_URL      # deve ser https://...
echo $VITE_USE_MOCK     # deve ser vazio ou "false" em prod
```
Se `VITE_API_URL` estiver vazio → o front cai em modo mock (dados estáticos, sem erro).  
Se estiver errado → fetch retorna 404/CORS → erro na tela.

**Passo 4 — Verificar CORS na API**
```
Console → Network → ver resposta do OPTIONS preflight
# Se: "Access-Control-Allow-Origin" ausente → CORS bloqueado
```

**Passo 5 — Verificar métricas de fetch**
```js
// No console do navegador em produção:
window.__horta_metrics__
// Verificar: fetch_errors / fetch_calls — taxa de erro > 50% indica API instável
```

**Passo 6 — Forçar modo mock temporariamente**
Adicionar `VITE_USE_MOCK=true` nas variáveis de ambiente do deploy e redeploy → dashboard exibe dados mockados enquanto a API é corrigida.

### Sintoma: Página de Histórico não carrega / paginação travada

1. Verificar `HistoricoPage loaded` nos logs — se `total: 0` com dados esperados → filtro de data muito restrito.
2. Confirmar que `VITE_API_URL` aponta para o environment correto (staging vs prod).
3. Verificar se a API retorna `totalPages` — ausência do campo quebra a paginação.

### Sintoma: Alertas não disparam mesmo com sensores offline

1. Verificar que o serviço de geração de alertas no backend está rodando.
2. No mock: alertas são gerados estaticamente — se o mock não reflete o estado real, verificar se `VITE_USE_MOCK` foi desativado.
3. Conferir `docs/dashboard/evidencias/npm-audit-20260605.json` para garantir que nenhuma dependência crítica foi comprometida.
