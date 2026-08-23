# Como criar um adaptador de agente

O `AgentRouterService` escolhe o adaptador pelo `provider` configurado no tenant (`tenant_agent_configs.provider`).

## 1. Contrato

```ts
// apps/api/src/modules/agent-router/agent-adapter.ts
export interface AgentAdapter {
  readonly provider: AgentProvider;
  send(request: AgentRequest, config: TenantAgentConfigRow, webhook: WebhookEndpointRow | null): Promise<AgentResponse>;
}
```

- `AgentRequest`: `{ tenantId, conversationId, visitorId, message }`.
- `AgentResponse`: `{ content: MessageContent, providerMessageId? }`.
- Erros SEMPRE `AgentRoutingError` com mensagem generica (nunca inclua URL ou segredo).

## 2. Normalizacao

Reaproveite os helpers de `adapter-support.ts`:

- `requireWebhookUrl(webhook?.url)` — garante endpoint configurado.
- `postJson({ url, headers, body, timeoutMs })` — POST com timeout via AbortController e erros seguros.
- `extractMessageText(message)` — achata `MessageContent` para prompt textual.
- `pickResponseText(payload, ["caminho.dotted", ...])` — extrai texto da resposta do provider.
- `normalizeAssistantText(texto)` — converte para `text` ou `markdown`.

## 3. Implemente

```ts
export class MeuProviderAdapter implements AgentAdapter {
  readonly provider = "custom" as const; // adicione um enum proprio em contracts se necessario

  async send(request, config, webhook) {
    const url = requireWebhookUrl(webhook?.url);
    const payload = await postJson({
      url,
      headers: webhook ? { Authorization: `Bearer ${webhook.secretRef}` } : {},
      body: { message: extractMessageText(request.message) },
      timeoutMs: config.timeoutMs
    });
    return { content: normalizeAssistantText(pickResponseText(payload, ["reply"])) };
  }
}
```

## 4. Registre

```ts
// agent-router.service.ts -> buildAdapters()
["meu_provider", new MeuProviderAdapter()],
```

## 5. Testes obrigatorios

Adicione um caso em `agent-router.contract.test.ts`:

```ts
{
  provider: "meu_provider",
  adapter: new MeuProviderAdapter(),
  successPayload: { reply: "Resposta" }
}
```

A suite compartilhada valida automaticamente: chamada ao webhook, resposta valida, erro 500 sem vazar URL, falha de rede e webhook ausente.

## Checklist

- [ ] Timeout respeitado (AbortController)
- [ ] Nenhum segredo/URL em mensagens de erro
- [ ] Resposta normalizada para `MessageContent`
- [ ] Contract test adicionado
- [ ] Retry/circuit breaker herdados do router (nao implementar por conta propria)
