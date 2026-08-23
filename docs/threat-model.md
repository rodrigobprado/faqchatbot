# Threat Model - faqchatbot

Referencia: `docs/architecture-plan.md` (secao 12). Modelo STRIDE simplificado por superficie.

## Superficies de ataque

| Superficie | Ator | Risco principal |
|---|---|---|
| Script do widget em sites de terceiros | Visitante anonimo | Abuso, XSS via mensagens, forjar data-agent |
| API publica (`/v1/widget/*`, `/v1/chat/*`) | Internet | Rajadas, enumeracao, bypass de dominio |
| API admin (`/v1/admin/*`, `/v1/auth/*`) | Usuario autenticado / atacante com credencial vazada | Escalacao de privilegio, exfiltracao multi-tenant |
| Agent Router -> provedores (n8n, OpenAI, ...) | Provedor externo comprometido ou lento | SSRF limitado a URL registrada; timeout/custo |
| Storage S3/MinIO | Admin autenticado | Upload malicioso, URL assinada vazada |
| Dashboard | Operador | XSS, token no localStorage |

## Ameaças e mitigações implementadas

### Forjar `data-agent` (spoofing)
- Tenant resolvido apenas por `public_id` registrado; tenant inexistente/inativo recebe erro generico `Invalid agent or origin` (sem enumeracao).
- JWT temporario escopo `widget`, TTL 1h, assinado com segredo dedicado (`JWT_WIDGET_SECRET`).

### Site nao autorizado iniciando sessao
- `POST /v1/widget/session/start` valida `Origin`/`Referer` contra `tenant_domains`.
- CORS dinamicamente restrito aos hostnames ativos + lista extra de dev (`CORS_EXTRA_ORIGINS`); falha fechada se o lookup de dominios errar.
- Testes: `widget-session.controller.test.ts`, `dynamic-origin.test.ts`.

### Vazamento de webhook/credenciais
- Webhook nunca sai da API: widget conversa somente com endpoints publicos.
- Erros de adaptador sao genericos ("Agent request failed"); nunca incluem URL nem segredo.
- Config publica do tenant exclui credenciais (`tenant-public-config.ts`).

### XSS via markdown/rich components
- Toda mensagem (usuario e assistente) passa por `sanitizeMessageContent` antes de persistir.
- Widget renderiza texto puro (sem HTML), Shadow DOM isola CSS/JS da pagina hospedeira.
- Contract tests rejeitam conteudo fora do schema Zod.

### Abuso do endpoint publico
- Rate limit Redis em 5 escopos: ip, tenant, api_key, visitor e conversation (`RateLimitService`).
- Politicas por plano persistidas em PostgreSQL; erros padronizados `429`.
- Circuit breaker por tenant/provider evita cascata de falhas contra provedores.

### Enumeracao de tenants
- Respostas uniformes para agente invalido/origem invalida.
- IDs internos sao UUIDs; `public_id` e o unico identificador exposto.

### Prompt injection / exfiltracao por adaptador
- Contexto da pagina tratado como dado nao confiavel: validado e truncado antes de persistir (`page-context.ts`, `PageContextSchema`).
- Adaptadores enviam apenas mensagem normalizada + identificadores; nenhum segredo vai no payload para o provider.

### Credenciais administrativas
- Senhas com Argon2; refresh token rotativo com segredo proprio; RBAC com guards `JwtAuthGuard` + `PermissionsGuard` em toda rota admin.
- API keys armazenadas apenas como hash + prefixo.
- Auditoria (`audit_logs`) em login e mudancas sensiveis.

## Itens residuais (monitorar)

- Tokens do dashboard ficam no localStorage (XSS no dashboard teria escopo do token). Mitigacao futura: cookies httpOnly SameSite.
- SSE in-memory por instancia exige sticky sessions ou broker externo quando houver replicas multiplas.
- MCP adapter usa transporte HTTP JSON-RPC minimo; validar allowlist de tools por tenant antes de exposicao ampla.
- Backup criptografado em repouso ainda depende do provedor de storage.
