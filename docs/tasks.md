# Backlog Detalhado - Embeddable AI Platform

## 1. Politica de execucao

Este backlog deve ser executado em TDD. Para cada modulo:

1. Escrever testes que falham.
2. Implementar o minimo para passar.
3. Refatorar mantendo cobertura.
4. Rodar lint, typecheck, unit, integration e security checks.
5. Atualizar docs quando houver mudanca de contrato.

Meta minima: 80% de cobertura global e cobertura alta nos dominios de seguranca, autenticacao, roteamento, rate limit e persistencia.

## 2. Fase 0 - Fundacao do repositorio

### Tarefas

- Criar monorepo com `pnpm workspaces`.
- Configurar Turborepo ou Nx.
- Criar `apps/api`, `apps/widget`, `apps/dashboard`.
- Criar `packages/contracts`, `packages/sdk-js`, `packages/config`, `packages/logger`, `packages/testing`.
- Configurar Typescript strict.
- Configurar ESLint, Prettier, commitlint e lint-staged.
- Criar Makefile com comandos padrao.
- Criar `.env.example`.
- Criar Docker Compose com PostgreSQL, Redis, MinIO e API.
- Criar GitHub Actions para lint, typecheck, test, build e audit.

### Testes

- Validar que `pnpm lint` roda em todos os pacotes.
- Validar que `pnpm typecheck` roda em todos os pacotes.
- Validar que `pnpm test` executa suite vazia inicial sem erro.
- Validar build do monorepo no CI.

### Criterios de aceite

- Repositorio sobe com `make dev`.
- CI executa em pull request.
- Nenhum pacote compila com `any` implicito.

## 3. Fase 1 - Contratos compartilhados

### Tarefas

- Definir contrato de `TenantPublicConfig`.
- Definir contrato de `WidgetSessionStartRequest`.
- Definir contrato de `WidgetSessionStartResponse`.
- Definir contrato de `ChatMessage`.
- Definir protocolo de rich components.
- Definir eventos publicos do widget.
- Definir eventos internos da plataforma.
- Exportar tipos em `packages/contracts`.
- Adicionar schemas de validacao.

### Testes

- Unit tests para validacao de cada tipo de mensagem.
- Contract tests para payloads validos e invalidos.
- Snapshot tests para OpenAPI quando API existir.

### Criterios de aceite

- Widget, SDK e API consomem os mesmos contratos.
- Payload invalido falha com erro claro.

## 4. Fase 2 - Banco, migrations e repositories

### Tarefas

- Escolher Prisma ou Drizzle.
- Criar migrations para:
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
  - `stored_files`
- Criar repositories por dominio.
- Criar seeds de desenvolvimento.
- Criar indices para `tenant_id`, `conversation_id`, `session_id`, `created_at` e `public_id`.

### Testes

- Integration tests com PostgreSQL em container.
- Testes de migrations up/down.
- Testes de constraints multi-tenant.
- Testes de soft delete quando aplicavel.

### Criterios de aceite

- Migrations reproduziveis do zero.
- Repositories nao vazam dados entre tenants.
- Seeds criam tenant demo, usuario admin e plano inicial.

## 5. Fase 3 - API base, Swagger e observabilidade

### Tarefas

- Criar NestJS com Fastify.
- Configurar Swagger em `/docs`.
- Configurar health checks.
- Configurar logger estruturado.
- Configurar correlation ID.
- Configurar exception filters.
- Configurar envelope padrao de resposta.
- Configurar validacao global de DTOs.
- Configurar Helmet e CORS dinamico.

### Testes

- Unit tests para filtros de erro.
- Integration tests para health checks.
- Integration tests para validacao de DTO.
- Security tests para headers Helmet.

### Criterios de aceite

- OpenAPI gerado automaticamente.
- Logs tem correlation ID.
- Erros nao vazam stack trace em producao.

## 6. Fase 4 - Autenticacao administrativa e RBAC

### Tarefas

- Implementar login admin.
- Implementar refresh token.
- Implementar hash de senha com Argon2.
- Implementar RBAC.
- Implementar guards e decorators.
- Implementar API keys hashadas.
- Implementar auditoria para login e mudancas sensiveis.

### Testes

- Unit tests para password hashing.
- Integration tests para login, refresh e logout.
- Security tests para token expirado, token invalido e permissao ausente.
- Tests para API key sem armazenamento em texto puro.

### Criterios de aceite

- Nenhuma rota admin sensivel acessivel sem permissao.
- Tokens possuem expiracao e escopo.
- API keys aparecem apenas uma vez ao criar.

## 7. Fase 5 - Tenant e configuracoes

### Tarefas

- CRUD de tenants.
- CRUD de dominios autorizados.
- CRUD de configuracao visual.
- CRUD de configuracao de agente.
- Validar status, plano e limites.
- Criptografar ou referenciar segredos de webhook.
- Implementar endpoint de config publica do widget via session start.

### Testes

- Unit tests para regras de tenant ativo/inativo.
- Integration tests para CRUD.
- Security tests para dominio nao autorizado.
- Tests para nao retornar webhook em payload publico.

### Criterios de aceite

- Tenant inativo nao inicia sessao.
- Widget recebe apenas configuracao publica.
- Webhook nunca aparece no frontend.

## 8. Fase 6 - Sessoes do widget

### Tarefas

- Implementar `POST /v1/widget/session/start`.
- Validar `data-agent` contra tenant publico.
- Validar dominio por `Origin` e `Referer`.
- Criar ou reabrir visitor session.
- Emitir JWT temporario com escopo `widget`.
- Persistir contexto automatico da pagina.
- Registrar evento `WidgetSessionStarted`.

### Testes

- Integration tests para sessao nova.
- Integration tests para reabertura de sessao.
- Security tests para dominio invalido.
- Security tests para tenant inexistente.
- Security tests para JWT com escopo errado.

### Criterios de aceite

- Todas as chamadas de chat exigem JWT temporario.
- Session IDs sao UUIDs.
- Contexto e salvo sem confiar em dados do cliente.

## 9. Fase 7 - Widget Lit e SDK JS

### Tarefas

- Criar widget com Lit.
- Usar Shadow DOM obrigatorio.
- Criar botao flutuante.
- Criar painel de chat responsivo.
- Implementar light mode, dark mode e tema por tenant.
- Implementar API publica `window.ChatWidget`.
- Implementar eventos publicos.
- Persistir `visitorId`, `sessionId` e `conversationId` em localStorage.
- Coletar contexto automatico.
- Implementar acessibilidade: foco, ARIA, teclado, contraste.
- Criar SDK JS separado quando fizer sentido.

### Testes

- Unit tests para estado do widget.
- Component tests para renderizacao no Shadow DOM.
- E2E tests com Playwright para abrir, fechar, enviar mensagem e destruir.
- Accessibility tests com axe.
- Bundle size test.

### Criterios de aceite

- CSS da pagina hospedeira nao afeta o widget.
- Widget nao usa iframe.
- API publica funciona de forma idempotente.
- Bundle fica dentro do limite definido no CI.

## 10. Fase 8 - Conversas, mensagens e streaming

### Tarefas

- Implementar `POST /v1/chat/messages`.
- Implementar `GET /v1/chat/stream/:conversationId` com SSE.
- Persistir mensagem do usuario.
- Persistir mensagem do assistente.
- Emitir eventos de typing e tokens.
- Implementar historico de conversa.
- Implementar sanitizacao de markdown.
- Implementar suporte inicial a rich components.

### Testes

- Unit tests para protocolo de mensagem.
- Integration tests para envio de mensagem.
- Integration tests para stream SSE.
- Security tests para XSS em markdown.
- Contract tests para rich components.

### Criterios de aceite

- Usuario ve resposta em tempo real.
- Mensagens ricas invalidas sao rejeitadas.
- Historico respeita tenant e conversa.

## 11. Fase 9 - Agent Router e adaptador n8n

### Tarefas

- Criar interface `AgentAdapter`.
- Criar `AgentRouterService`.
- Criar adaptador n8n.
- Criar normalizador de entrada e saida.
- Implementar timeout, retry e circuit breaker.
- Implementar logs por provider.
- Implementar mascaramento de segredos.
- Permitir provider por tenant.

### Testes

- Unit tests para selecao de adaptador.
- Unit tests para normalizacao.
- Integration tests com mock de webhook n8n.
- Failure tests para timeout, 500 e payload invalido.
- Security tests para nao expor webhook em erro.

### Criterios de aceite

- API e widget nao dependem do n8n.
- Troca de provider exige apenas configuracao de tenant.
- Falhas do provider retornam erro seguro ao widget.

## 12. Fase 10 - Rate limit e protecao antiabuso

### Tarefas

- Implementar Redis rate limiter.
- Politicas por IP.
- Politicas por tenant.
- Politicas por API key.
- Politicas por visitor/session.
- Protecao contra rajadas por conversa.
- Eventos `RateLimitExceeded`.
- Dashboard basico de limites por tenant.

### Testes

- Unit tests para calculo de limite.
- Integration tests com Redis.
- Security tests para excesso por IP.
- Security tests para excesso por tenant.
- Tests para reset de janela.

### Criterios de aceite

- Abuso publico nao derruba API.
- Limites sao configuraveis por plano.
- Erros de limite sao padronizados.

## 13. Fase 11 - Analytics e eventos

### Tarefas

- Criar event bus interno.
- Persistir analytics events.
- Registrar tempo de resposta.
- Registrar tempo de conversa.
- Registrar abandono.
- Registrar origem, dispositivo e URL.
- Registrar CTR de botoes.
- Registrar resolucao.
- Criar agregacoes iniciais por tenant.

### Testes

- Unit tests para eventos.
- Integration tests para persistencia.
- Tests para agregacao por periodo.
- Tests para nao bloquear chat quando analytics falha.

### Criterios de aceite

- Analytics e desacoplado do fluxo principal.
- Falha de analytics nao impede conversa.
- Dados sempre possuem tenant ID.

## 14. Fase 12 - Dashboard administrativo

### Tarefas

- Criar login.
- Criar layout administrativo.
- Criar tela de dashboard.
- Criar tela de clientes.
- Criar tela de analytics.
- Criar tela de conversas.
- Criar tela de sessoes.
- Criar tela de logs.
- Criar tela de configuracoes.
- Criar tela de planos.
- Criar tela de usuarios e permissoes.
- Criar formularios com validacao.

### Testes

- Unit tests para componentes criticos.
- Integration tests para chamadas de API.
- E2E tests para login e CRUD de tenant.
- Accessibility tests.

### Criterios de aceite

- Usuario admin consegue configurar tenant sem tocar no banco.
- Permissoes restringem telas e acoes.
- Dashboard nao exibe segredos.

## 15. Fase 13 - Storage e arquivos

### Tarefas

- Configurar S3 compativel.
- Implementar upload seguro de logo, avatar e arquivos de conversa.
- Validar MIME type e tamanho.
- Gerar URLs assinadas.
- Integrar MinIO no Docker Compose.
- Registrar arquivos em `stored_files`.

### Testes

- Integration tests com MinIO.
- Security tests para extensao falsa.
- Security tests para tamanho maximo.
- Tests para URL assinada expirada.

### Criterios de aceite

- Upload nao aceita arquivos fora da politica.
- Arquivos privados nao sao publicos por padrao.

## 16. Fase 14 - CDN e build do widget

### Tarefas

- Configurar build versionado do widget.
- Gerar `widget.js` e assets com hash.
- Criar endpoint ou pipeline para publicar em CDN.
- Criar fallback local para desenvolvimento.
- Criar estrategia de cache busting.
- Documentar snippet de instalacao.

### Testes

- Build tests.
- Bundle size tests.
- E2E carregando widget via script externo.
- Tests para compatibilidade com navegadores alvo.

### Criterios de aceite

- Script unico instala widget.
- Cache pode ser invalidado por versao.
- Widget nao quebra em paginas com CSS agressivo.

## 17. Fase 15 - Adaptadores adicionais

### Tarefas

- Implementar OpenAI Responses API adapter.
- Implementar LangGraph adapter.
- Implementar Dify adapter.
- Implementar Flowise adapter.
- Implementar MCP Server adapter.
- Criar registry de providers.
- Criar contract tests compartilhados entre adaptadores.

### Testes

- Unit tests por adaptador.
- Contract tests da interface `AgentAdapter`.
- Failure tests por timeout e erro de provider.
- Tests para streaming normalizado.

### Criterios de aceite

- Todo adaptador implementa o mesmo contrato.
- Router consegue trocar provider por tenant sem alterar widget.

## 18. Fase 16 - Kubernetes e producao

### Tarefas

- Criar Dockerfiles para API, widget e dashboard.
- Criar manifests Kubernetes.
- Criar ConfigMaps e Secrets templates.
- Criar readiness e liveness probes.
- Criar HPA.
- Criar ingress.
- Criar runbook de deploy.
- Criar runbook de rollback.
- Criar backup/restore do PostgreSQL.

### Testes

- Build de imagens no CI.
- Smoke tests contra ambiente Docker Compose.
- K8s manifest validation.
- Security scan de imagens.

### Criterios de aceite

- Ambiente local sobe completo.
- Imagens sao reproduziveis.
- Manifests estao prontos para cluster real com secrets externos.

## 19. Fase 17 - Hardening de seguranca

### Tarefas

- Revisar CORS dinamico.
- Revisar JWT scopes.
- Revisar sanitizacao.
- Revisar armazenamento de segredos.
- Implementar auditoria completa.
- Implementar mascaramento de logs.
- Rodar `npm audit` ou equivalente.
- Adicionar SAST no CI.
- Adicionar dependency review.
- Criar threat model documentado.

### Testes

- Security regression tests.
- Tests para secrets ausentes na saida de logs.
- Tests para dominios nao autorizados.
- Tests para XSS em markdown e rich components.
- Tests para API keys revogadas.

### Criterios de aceite

- Nenhum segredo em logs, frontend ou erros.
- Endpoints publicos protegidos contra abuso basico.
- CI falha em vulnerabilidades criticas.

## 20. Fase 18 - Documentacao e DX

### Tarefas

- Atualizar README principal.
- Documentar arquitetura.
- Documentar API admin.
- Documentar API do widget.
- Documentar protocolo de mensagens.
- Documentar como criar adaptador.
- Documentar deploy local.
- Documentar deploy Kubernetes.
- Criar exemplos de integracao.

### Testes

- Validar links de docs.
- Validar snippets com testes quando possivel.
- Smoke test do quickstart.

### Criterios de aceite

- Novo desenvolvedor consegue rodar o projeto em menos de 15 minutos.
- Cliente consegue instalar widget com um script.
- Integrador consegue criar novo provider lendo a documentacao.

## 21. Ordem de execucao sugerida para os primeiros commits

1. `chore: initialize monorepo tooling`
2. `test: add contract validation tests`
3. `feat: add shared platform contracts`
4. `test: add database integration harness`
5. `feat: add initial tenant schema and repositories`
6. `feat: add api bootstrap with validation and swagger`
7. `feat: add admin auth and rbac`
8. `feat: add widget session tokens`
9. `feat: add lit widget shell`
10. `feat: add chat message persistence and sse stream`
11. `feat: add agent router with n8n adapter`
12. `feat: add analytics event pipeline`

## 22. Definition of Done por modulo

- Testes unitarios escritos antes da implementacao.
- Testes de integracao para bordas externas.
- Tipos exportados quando houver contrato compartilhado.
- Swagger atualizado para rotas publicas/admin.
- Logs estruturados com correlation ID.
- Nenhum segredo em payload publico.
- Erros padronizados.
- Cobertura igual ou maior que 80%.
- Documentacao atualizada quando o comportamento publico mudar.

