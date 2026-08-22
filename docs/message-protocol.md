# Protocolo de Mensagens

Todas as mensagens trafegam como `MessageContent` validado por Zod (`packages/contracts/src/messages.ts`).

## Tipos de conteudo

| `type` | Campos principais | Uso |
|---|---|---|
| `text` | `text` | Mensagem simples |
| `markdown` | `markdown` | Resposta formatada (sanitizada na API) |
| `image`, `video`, `audio`, `file` | `url`, `title?`, `mimeType?`, `sizeBytes?` | Midia com URL http(s) |
| `card` | `title`, `description?`, `imageUrl?`, `buttons[]` | Card com ate 6 botoes |
| `carousel` | `items[]` | 1 a 10 cards |
| `quick_replies` | `text`, `replies[]` | Respostas rapidas (ate 12) |
| `table` | `columns[]`, `rows[][]` | Tabela simples |
| `form` | `title`, `fields[]`, `submitLabel` | Coleta de dados |
| `location` | `latitude`, `longitude`, `label?` | Localizacao |
| `calendar` | `title`, `availableSlots[]` | Agendamento |
| `typing`, `error`, `system` | `text?`, `code?` | Status |

## Envelope de mensagem persistida (`ChatMessage`)

```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "tenantId": "uuid",
  "role": "user|assistant|system",
  "content": { "type": "text", "text": "..." },
  "metadata": {},
  "createdAt": "ISO-8601"
}
```

## Eventos do stream SSE

Endpoint: `GET /v1/chat/stream/:conversationId` (Bearer widget token).

```
event: message
data: {"type":"typing"}

data: {"type":"token","token":"Ola"}

data: {"type":"message","message":{ ... ChatMessage ... }}

data: {"type":"error","message":"Nao foi possivel obter uma resposta no momento."}
```

- `typing`: provedor processando.
- `token`: fragmento incremental da resposta (o widget junta os tokens com espaco).
- `message`: mensagem final do assistente persistida.
- `error`: falha segura; nunca expoe detalhes do provider.

## Regras

1. Payload invalido -> HTTP 400 com mensagem clara.
2. Conteudo e sanitizado antes da persistencia; o stream entrega apenas mensagens ja sanitizadas.
3. Todo acesso exige JWT com escopo correto (`widget` para o chat publico).
