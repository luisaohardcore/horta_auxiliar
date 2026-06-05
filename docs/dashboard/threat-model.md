# Threat Model — Dashboard HortaSmart

**Escopo:** Front-end React do dashboard de monitoramento.  
**Data:** 2026-06-05  
**Versão:** 1.0 (A1.8 / Release 2)  
**Autores:** Equipe HortaSmart

---

## 1. Ativos

| Ativo | Descrição | Sensibilidade |
|---|---|---|
| Leituras dos sensores | Temperatura, umidade, pH, luminosidade exibidas no dashboard | Baixa (dados não pessoais, mas críticos para integridade operacional) |
| Eventos de irrigação | Histórico de acionamentos (automático e manual) | Média (auditabilidade e rastreabilidade) |
| Endpoint da API REST | `/api/v1/telemetria`, `/api/v1/alertas`, `/api/v1/canteiros` | Alta (controle de atuadores físicos) |
| Token Bearer da API | Usado para autenticação nas rotas POST/PUT/DELETE | Alta (permite comandos físicos na horta) |
| Nome/dados de canteiros | Strings inseridas pelo usuário via CRUD | Baixa-Média (potencial vetor XSS) |

---

## 2. Ameaças Concretas

### T-01 — XSS no campo Nome do Canteiro

**Descrição:** O campo `nome` do formulário de cadastro é renderizado diretamente no DOM via JSX (`{c.nome}`). Um atacante com acesso ao endpoint de criação de canteiros poderia injetar `<script>alert(1)</script>` ou payload de exfiltração de cookies.

**Vetor:** POST `/api/v1/canteiros` com payload malicioso → renderizado em `CanteirosPage.jsx`.

**Mitigação aplicada:** React escapa automaticamente expressões JSX — `{c.nome}` nunca será interpretado como HTML raw. Nenhum uso de `dangerouslySetInnerHTML` no codebase.

**Status:** ✅ Mitigado (React default escaping)

**Evidência:** `grep -r "dangerouslySetInnerHTML" src/` retorna vazio.

---

### T-02 — Dados em trânsito sem TLS

**Descrição:** Se o endpoint `VITE_API_URL` apontar para `http://` (sem TLS), todas as leituras de sensores e tokens Bearer trafegam em texto plano — sujeitos a MITM em redes Wi-Fi do ambiente da horta.

**Vetor:** Rede Wi-Fi da horta sem isolamento de clientes → sniffing de pacotes HTTP.

**Mitigação aplicada:** 
- Documentado como **requisito de implantação**: `VITE_API_URL` deve usar `https://` obrigatoriamente.
- Em desenvolvimento, o mock local não expõe tráfego de rede real.

**Status:** ⚠️ Dívida técnica — não é aplicável durante mock, mas deve ser enforçado no deploy via CSP + HSTS.

**Ação pendente:** Adicionar header `Content-Security-Policy: upgrade-insecure-requests` e `Strict-Transport-Security` no servidor de hospedagem do front.

---

### T-03 — Exposição de credenciais Wi-Fi do ESP32 em logs do front

**Descrição:** A API retorna dados de telemetria que incluem metadados do nó sensor. Se o firmware ESP32 retornar o SSID ou hash da senha Wi-Fi nos logs de debug e o front-end logar o objeto de resposta completo, as credenciais ficam expostas no console do navegador.

**Vetor:** `logger.info('telemetryService', 'fetch_ok', { url, status, ms })` — payload não loga o body da resposta, mas um erro futuro pode.

**Mitigação aplicada:**
- O `logger.js` registra apenas metadados de fetch (URL, status, latência) — nunca o body da resposta.
- O backend ESP32 não deve incluir credenciais Wi-Fi no payload JSON (responsabilidade do firmware — documentada no RFC-001).

**Status:** ✅ Mitigado no front. Dívida técnica no firmware (fora do escopo deste documento).

---

### T-04 — Injeção em parâmetros de filtro (Query Injection)

**Descrição:** Os filtros de Alertas e Histórico (canteiro, tipo, período) são passados como query params para a API. Se a API não sanitizar esses inputs, um atacante poderia injetar operadores de busca (`canteiro=*' OR 1=1`).

**Vetor:** URL parameters em `alertasService.js` via `URLSearchParams`.

**Mitigação aplicada:**
- `URLSearchParams` encoda automaticamente caracteres especiais.
- Os valores de filtro são validados no mock contra listas fixas de IDs conhecidos.
- A sanitização de ORM/query parameterization é responsabilidade do backend.

**Status:** ✅ Mitigado no front (URLSearchParams encoding). Responsabilidade de sanitização final no backend.

---

### T-05 — CSRF em operações destrutivas (DELETE canteiro)

**Descrição:** A rota DELETE `canteiro/:id` é chamada via `fetch()` com método DELETE. Sem proteção CSRF, uma página maliciosa pode disparar essa requisição se o usuário estiver autenticado e os cookies forem enviados automaticamente.

**Vetor:** Página maliciosa com `fetch('https://api.hortasmart.io/api/v1/canteiros/canteiro-a', { method: 'DELETE', credentials: 'include' })`.

**Mitigação aplicada:**
- O front usa token Bearer no header `Authorization` — cookies não são o mecanismo de auth, portanto CSRF clássico não se aplica.
- Tokens Bearer em `Authorization` header não são enviados automaticamente por navegadores cross-origin.

**Status:** ✅ Mitigado por uso de Bearer token em vez de cookies.

---

## 3. Evidência de SCA (Software Composition Analysis)

```
npm audit -- executado em 2026-06-05
Resultado completo em: docs/dashboard/evidencias/npm-audit-20260605.json
```

Resumo: 0 vulnerabilidades críticas ou altas identificadas nas dependências diretas. Vulnerabilidades de desenvolvimento (devDependencies) não impactam o bundle de produção.

---

## 4. Dívidas Técnicas Registradas

| ID | Ameaça | Dívida | Prioridade |
|---|---|---|---|
| DT-01 | T-02 | Enforçar HTTPS via CSP + HSTS no servidor de hospedagem | Alta |
| DT-02 | T-03 | Auditar firmware ESP32 para garantir ausência de credenciais no payload | Média |
| DT-03 | — | Implementar autenticação de usuário no dashboard (fora do escopo PI atual) | Baixa |
