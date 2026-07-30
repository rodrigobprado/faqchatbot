# Plano de Arquitetura - Embeddable AI Platform

## 1. Visao do produto

A plataforma sera um SaaS multi-tenant para criar, configurar, publicar e operar assistentes de IA embarcaveis em sites de clientes. O widget de chat e apenas uma interface publica; o nucleo do produto deve suportar multiplos canais, motores de IA, componentes ricos, analytics, auditoria, faturamento por plano e operacao em escala.

O cliente instala o produto com um unico script:

```html
<script
  src="https://cdn.minhaplataforma.com/widget.js"
  data-agent="empresa123">
</script>
```

O widget nunca conhece webhooks, chaves internas, provedores de IA ou detalhes de roteamento. Ele inicializa uma sessao temporaria, recebe um JWT de escopo limitado e conversa apenas com a API publica da plataforma via HTTPS, SSE ou WebSocket.

## 2. Decisao arquitetural principal

O n8n nao deve ser o destino unico da plataforma. Ele sera um adaptador dentro de uma camada chamada `Agent Router`.

```text
Cliente
  |
  v
Widget isolado por Shadow DOM
  |
  v
API Gateway
  |
  v
Agent Router
  |-- n8n Adapter
  |-- OpenAI Responses API Adapter
  |-- LangGraph Adapter
  |-- Flowise Adapter
  |-- Dify Adapter
  |-- CrewAI Adapter
  |-- MCP Server Adapter
  `-- Custom Agent Adapter
```

Essa decisao reduz acoplamento, permite trocar o mecanismo de IA por tenant, preserva a API publica do widget e evita que o roadmap fique preso ao n8n.

## 3. Principios de arquitetura

- Multi-tenant desde o primeiro commit.
- Widget sem conhecimento de webhook, credenciais ou provedor de IA.
- API publica estavel e versionada.
- Baixo acoplamento entre interface, gateway, roteamento de agentes e persistencia.
- Alta coesao por dominio: tenant, sessao, conversa, mensagem, analytics, autenticacao, eventos e billing.
- Clean Architecture com DDD pragmatico onde houver regra de negocio real.
- Repository Pattern para persistencia.
- Dependency Injection obrigatoria via NestJS.
- Contratos fortemente tipados em Typescript.
- Validacao de entrada em todas as bordas.
- Eventos internos para desacoplar analytics, logs, auditoria e notificacoes.
- Testes automatizados desde o inicio, com meta minima de 80% de cobertura.

## 4. Stack alvo

### Monorepo

- pnpm workspaces
- Turborepo ou Nx para cache, builds e pipelines
- Typescript em todos os pacotes
- ESLint, Prettier, commitlint e lint-staged

### Widget

- Lit
- Shadow DOM obrigatorio
- Vite
- Typescript
- Bundle pequeno, publicado como `widget.js`
- Sem iframe
- CSS isolado e tokens de tema
- API publica em `window.ChatWidget`

Lit e a escolha inicial por gerar bundles menores e Web Components nativos, mantendo compatibilidade alta com qualquer site cliente.

### Backend

- NestJS
- Fastify
- Swagger/OpenAPI
- JWT
- Zod ou class-validator para DTOs
- Prisma ou Drizzle para acesso ao PostgreSQL
- Redis para cache, rate limit e pub/sub
- BullMQ para filas quando necessario

### Dashboard Administrativo

- Next.js ou Vite React
- Typescript
- RBAC
- Autenticacao via JWT e refresh token
- UI orientada a operacao: clientes, conversas, sessoes, logs, analytics, planos e configuracoes

### Infraestrutura

- PostgreSQL
- Redis
- S3 compativel para arquivos e assets
- Docker e Docker Compose
- Manifests preparados para Kubernetes
- CDN para assets do widget
- GitHub Actions para CI/CD

## 5. Estrutura proposta do monorepo

```text
.
|-- apps/
|   |-- api/
|   |-- widget/
|   `-- dashboard/
|-- packages/
|   |-- contracts/
|   |-- sdk-js/
|   |-- config/
|   |-- eslint-config/
|   |-- tsconfig/
|   |-- ui/
|   |-- logger/
|   `-- testing/
|-- infra/
|   |-- docker/
|   |-- k8s/
|   |-- migrations/
|   `-- terraform/
|-- docs/
|   |-- architecture-plan.md
|   `-- tasks.md
|-- scripts/
|-- .github/
|   `-- workflows/
|-- docker-compose.yml
|-- Makefile
|-- pnpm-workspace.yaml
`-- README.md
```

## 6. Modulos de dominio

### Tenant

Responsavel por clientes, dominio autorizado, status, plano, limites, configuracao visual, idioma, modelo IA e destino logico do agente.

### Auth

Responsavel por usuarios administrativos, login, refresh token, RBAC, API keys, tokens temporarios do widget e validacao de escopo.

### Sessions

Cria e reabre sessoes de visitantes. Cada visitante recebe `visitorId`, `sessionId` e `conversationId`. O widget persiste identificadores em `localStorage`, mas o backend valida continuidade e tenant.

### Conversations

Orquestra conversas, mensagens, historico, eventos de typing, status, encerramento e reabertura.

### Agent Router

Resolve tenant, politica, limites, modelo e adaptador de IA. Ele recebe um contrato padrao de mensagem e transforma para o protocolo do provedor escolhido.

### Rich Components

Define protocolo de mensagens para `text`, `markdown`, `image`, `video`, `audio`, `card`, `carousel`, `buttons`, `quick_replies`, `table`, `form`, `calendar`, `file`, `location`, `typing`, `error` e `system`.

### Streaming

Expõe SSE e, em fase posterior, WebSocket. SSE deve ser o caminho inicial por simplicidade operacional, compatibilidade com proxies e menor custo de infraestrutura.

### Analytics

Registra eventos de conversa, tempo de resposta, abandono, origem, URL, dispositivo, CTR de botoes, resolucao e funil. Deve consumir eventos internos em vez de ficar acoplado ao fluxo principal do chat.

### Logs e Auditoria

Logs estruturados com correlation ID, tenant ID e session ID. Auditoria para mudancas administrativas, API keys, webhooks, plano, limites e configuracoes sensiveis.

## 7. Fluxos principais

### Inicializacao do widget

```text
Script carrega
  |
  v
Le data-agent
  |
  v
Coleta contexto publico da pagina
  |
  v
POST /v1/widget/session/start
  |
  v
API valida tenant, dominio e limites
  |
  v
Retorna JWT temporario + config publica + session IDs
  |
  v
Widget renderiza botao flutuante
```

### Chat com streaming

```text
Usuario envia mensagem
  |
  v
POST /v1/chat/messages
  |
  v
Gateway valida JWT, dominio, tenant e rate limit
  |
  v
Conversation Service persiste mensagem do usuario
  |
  v
Agent Router seleciona adaptador
  |
  v
Adaptador chama n8n, OpenAI, LangGraph, Dify ou outro provedor
  |
  v
Resposta volta como stream normalizado
  |
  v
Mensagem do assistente e eventos sao persistidos
  |
  v
Widget recebe tokens em tempo real por SSE
```

## 8. API publica inicial

### Widget session

- `POST /v1/widget/session/start`
- Entrada: `agentId`, `visitorId`, `sessionId`, `conversationId`, contexto da pagina
- Saida: JWT temporario, expiracao, configuracao publica, limites publicos

### Chat

- `POST /v1/chat/messages`
- `GET /v1/chat/stream/:conversationId`
- `GET /v1/chat/history/:conversationId`

### Admin

- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/admin/tenants`
- `POST /v1/admin/tenants`
- `PATCH /v1/admin/tenants/:id`
- `GET /v1/admin/conversations`
- `GET /v1/admin/analytics`
- `GET /v1/admin/logs`

## 9. API publica do widget

```ts
window.ChatWidget.open();
window.ChatWidget.close();
window.ChatWidget.toggle();
window.ChatWidget.send("Ola");
window.ChatWidget.identify({
  id: "",
  nome: "",
  email: ""
});
window.ChatWidget.setTheme();
window.ChatWidget.destroy();
```

Eventos:

- `onOpen`
- `onClose`
- `onMessage`
- `onTyping`
- `onError`
- `onConnect`
- `onDisconnect`
- `onConversationStart`
- `onConversationEnd`

## 10. Contexto automatico enviado pelo widget

- URL
- Titulo
- Idioma
- Referrer
- UTM
- Viewport
- User Agent
- Pagina atual
- Timestamp

Esse contexto deve ser validado, normalizado e tratado como dado nao confiavel.

## 11. Modelo de banco de dados

### Tabelas principais

- `tenants`
- `tenant_domains`
- `tenant_configs`
- `tenant_agent_configs`
- `plans`
- `users`
- `roles`
- `permissions`
- `user_roles`
- `api_keys`
- `visitor_sessions`
- `conversations`
- `messages`
- `message_events`
- `analytics_events`
- `rate_limit_policies`
- `rate_limit_counters`
- `audit_logs`
- `system_logs`
- `webhook_endpoints`
- `agent_router_configs`
- `stored_files`

### Campos essenciais de `tenants`

- `id`
- `public_id`
- `name`
- `status`
- `plan_id`
- `default_locale`
- `created_at`
- `updated_at`
- `deleted_at`

### Campos essenciais de `tenant_agent_configs`

- `id`
- `tenant_id`
- `provider`
- `model`
- `webhook_endpoint_id`
- `encrypted_credentials_ref`
- `routing_rules`
- `timeout_ms`
- `retry_policy`
- `is_active`

### Campos essenciais de `messages`

- `id`
- `tenant_id`
- `conversation_id`
- `role`
- `type`
- `content`
- `metadata`
- `provider_message_id`
- `created_at`

Conteudos ricos devem ser armazenados em `jsonb`, com schema validado na aplicacao.

## 12. Segurança

### Regras obrigatorias

- HTTPS obrigatorio em producao.
- Helmet habilitado.
- CORS restrito por dominio do tenant.
- Validacao de dominio em `/session/start`.
- JWT temporario para widget com expiracao curta.
- Refresh token apenas para dashboard administrativo.
- API keys hashadas, nunca armazenadas em texto puro.
- Webhooks e credenciais criptografados ou referenciados via secret manager.
- Sanitizacao de markdown e HTML.
- Rate limit por IP, tenant, API key e visitor.
- Protecao contra spam e bots.
- Auditoria para operacoes sensiveis.
- Logs sem segredos, tokens ou payloads sensiveis.

### Ameacas principais

- Cliente forjando `data-agent`.
- Site nao autorizado tentando iniciar sessao de outro tenant.
- Vazamento de webhook n8n.
- XSS via mensagens markdown.
- Abuso de endpoint publico de chat.
- Enumeracao de tenants.
- Prompt injection vindo do usuario final.
- Exfiltracao de dados por adaptadores de IA.

## 13. Rate limit e abuso

Camadas:

- IP: protege endpoints publicos.
- Tenant: impede que um cliente consuma capacidade global.
- API key: protege uso administrativo e server-to-server.
- Visitor/session: reduz spam automatizado.
- Conversation: limita rajadas de mensagens.

Redis sera usado para contadores de baixa latencia. Politicas persistidas ficam no PostgreSQL.

## 14. Eventos internos

Eventos devem ser publicados por uma interface comum:

- `WidgetSessionStarted`
- `ConversationStarted`
- `MessageReceived`
- `AgentRoutingStarted`
- `AgentRoutingFailed`
- `AssistantMessageStreamed`
- `ConversationEnded`
- `ButtonClicked`
- `LeadIdentified`
- `RateLimitExceeded`
- `AdminConfigChanged`

Consumidores:

- Analytics
- Audit logs
- Notification jobs
- Webhooks futuros
- Data warehouse futuro

## 15. Observabilidade

- Logs estruturados em JSON.
- Correlation ID por request.
- Trace ID por conversa.
- Metricas de latencia por tenant e provider.
- Metricas de erro por adaptador.
- Health checks para API, PostgreSQL, Redis e storage.
- Readiness/liveness probes para Kubernetes.

## 16. Deploy e escalabilidade

### Fase inicial

- Docker Compose com API, widget build, dashboard, PostgreSQL, Redis, MinIO e reverse proxy.
- CDN simulado localmente para `widget.js`.

### Producao

- API stateless com replicas horizontais.
- Redis gerenciado.
- PostgreSQL gerenciado com backups e read replicas quando necessario.
- S3 compativel para arquivos.
- CDN para widget e assets.
- Kubernetes com HPA, readiness/liveness e secrets externos.

## 17. Estratégia de testes

- Unit tests para entidades, value objects, services, adapters e validações.
- Integration tests para controllers, repositories, banco, Redis e autenticação.
- Contract tests para protocolo do widget, mensagens ricas e adaptadores.
- E2E tests para sessao, envio de mensagem, streaming, dashboard login e configuracao de tenant.
- Security tests para CORS, JWT, rate limit, sanitizacao e dominios autorizados.
- Coverage minimo: 80%.

## 18. Ordem recomendada de implementacao

1. Monorepo, tooling, CI e convencoes.
2. Contratos compartilhados.
3. Banco, migrations e repositories.
4. Auth administrativa e RBAC.
5. Tenant e configuracoes.
6. Widget session com JWT temporario.
7. Widget Lit com Shadow DOM e API publica.
8. Conversas, mensagens e SSE.
9. Agent Router com adaptador n8n inicial.
10. Analytics por eventos.
11. Dashboard administrativo.
12. Rate limit completo e hardening de seguranca.
13. Adaptadores adicionais de IA.
14. Kubernetes e operacao avancada.

## 19. Decisoes a reavaliar antes de producao

- Prisma vs Drizzle conforme necessidade de migrations, tipagem e performance operacional.
- SSE inicial vs WebSocket para todos os casos.
- Next.js vs Vite React no dashboard.
- Fila BullMQ desde o inicio ou apenas quando houver processamento assíncrono real.
- Separacao futura da API em servicos independentes quando o volume justificar.

