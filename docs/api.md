# Referencia da API

Base local: `http://localhost:3000` - Swagger interativo em `/docs`.
Todas as respostas JSON usam o envelope `{ "data": ... }`.

## Autenticacao

| Escopo | Como obter | Onde usar |
|---|---|---|
| Admin (`scope: "admin"`) | `POST /v1/auth/login` (email/senha) -> access + refresh token | Rotas `/v1/admin/*`, header `Authorization: Bearer <access>` |
| Widget (`scope: "widget"`) | `POST /v1/widget/session/start` -> JWT temporario (1h) | Rotas `/v1/chat/*`, header `Authorization: Bearer <token>` |

- `POST /v1/auth/refresh` renova o access token.
- Refresh token e exclusivo do dashboard; o widget nunca recebe refresh.

## Widget (publico, JWT de widget)

| Metodo | Rota | Descricao |
|---|---|---|
| POST | `/v1/widget/session/start` | Cria/reabre sessao. Entrada: `agentId` (public_id do tenant), `visitorId?`, `sessionId?`, `conversationId?`, `context{}`. Saida: accessToken, IDs, config publica |
| POST | `/v1/chat/messages` | `{ conversationId, content }`. Retorna mensagem do usuario persistida; resposta do assistente chega via stream |
| GET | `/v1/chat/stream/:conversationId` | Stream SSE (`typing`, `token`, `message`, `error`) |
| GET | `/v1/chat/history/:conversationId` | Historico da conversa |
| POST | `/v1/chat/events/button-click` | Registra clique em botao rico |
| POST | `/v1/chat/conversations/:id/end` | Encerra conversa (`reason: resolved|abandoned`) |

Validacoes de sessao: dominio por Origin/Referer, tenant ativo com plano e limites validos, rate limit por IP e tenant.

## Admin (JWT admin + permissao)

Autenticacao/RBAC:

| Metodo | Rota | Permissao |
|---|---|---|
| POST | `/v1/auth/login` | - |
| POST | `/v1/auth/refresh` | - |
| GET | `/v1/admin/permissions` | tenants:read |

Tenants:

| Metodo | Rota | Permissao |
|---|---|---|
| GET / POST | `/v1/admin/tenants` | read / write |
| GET / PATCH / DELETE | `/v1/admin/tenants/:id` | read / write |
| GET / POST | `/v1/admin/tenants/:id/domains` | read / write |
| DELETE | `/v1/admin/tenants/:id/domains/:domainId` | write |
| GET / PUT | `/v1/admin/tenants/:id/config` | read / write |
| GET / PUT | `/v1/admin/tenants/:id/agent-config` | read / write |
| GET / PUT | `/v1/admin/tenants/:id/rate-limits` | read / write |
| GET | `/v1/admin/tenants/:id/analytics` | read |
| GET | `/v1/admin/tenants/:id/conversations` | read |
| GET | `/v1/admin/tenants/:id/sessions` | read |
| GET | `/v1/admin/tenants/:id/audit-logs` | read |
| GET / POST | `/v1/admin/tenants/:id/users` | read / write |
| GET / POST | `/v1/admin/tenants/:id/roles` | read / write |

Planos:

| Metodo | Rota | Permissao |
|---|---|---|
| GET / POST | `/v1/plans` | read / write |
| GET / PATCH / DELETE | `/v1/plans/:id` | read / write |

Logs e arquivos:

| Metodo | Rota | Permissao |
|---|---|---|
| GET | `/v1/admin/logs?tenantId&level&limit&offset` | tenants:read |
| GET | `/v1/admin/files` | tenants:read |
| POST | `/v1/admin/files/upload` (multipart campo `file`; `?purpose=logo\|avatar\|conversation`) | tenants:write |
| GET | `/v1/admin/files/:id/url` | tenants:read |

Upload aceita `image/png|jpeg|webp|gif` e `application/pdf`, maximo 5MB. Resposta: `{ fileId, objectKey }`. URLs sao assinadas (15 min).

## Erros

```json
{ "error": { "statusCode": 403, "message": "Invalid agent or origin", "correlationId": "uuid" } }
```

Rate limit excedido retorna `429` padronizado. Nenhum erro 5xx expoe stack trace.
