import type { MessageContent } from "@faqchatbot/contracts";
import { AgentRoutingError } from "./agent-adapter.js";

export const extractMessageText = (content: MessageContent): string => {
  if (content.type === "text") {
    return content.text;
  }
  if (content.type === "markdown") {
    return content.markdown;
  }
  return `[${content.type}]`;
};

export const requireWebhookUrl = (webhookUrl: string | null | undefined): string => {
  if (!webhookUrl) {
    throw new AgentRoutingError("No webhook configured for this tenant");
  }
  return webhookUrl;
};

export type JsonPostOptions = {
  url: string;
  headers?: Record<string, string>;
  body: unknown;
  timeoutMs: number;
};

export const postJson = async ({ url, headers = {}, body, timeoutMs }: JsonPostOptions): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(timeoutMs, 1));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new AgentRoutingError(`Agent provider responded with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    return payload;
  } catch (error) {
    if (error instanceof AgentRoutingError) {
      throw error;
    }
    throw new AgentRoutingError("Failed to reach the agent provider");
  } finally {
    clearTimeout(timeout);
  }
};

const MARKDOWN_HINTS = ["\n#", "\n-", "**", "```", "](", "\n1. "];

export const normalizeAssistantText = (raw: string): MessageContent => {
  const text = raw.trim();
  if (text.length === 0) {
    throw new AgentRoutingError("Agent provider returned an empty response");
  }

  const looksLikeMarkdown = MARKDOWN_HINTS.some((hint) => text.includes(hint));
  return looksLikeMarkdown ? { type: "markdown", markdown: text } : { type: "text", text };
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

export const pickResponseText = (payload: unknown, paths: readonly string[]): string => {
  for (const path of paths) {
    let current: unknown = payload;
    for (const key of path.split(".")) {
      if (!isRecord(current)) {
        current = undefined;
        break;
      }
      current = current[key];
    }

    if (typeof current === "string") {
      const text = asString(current);
      if (text) {
        return text;
      }
    } else if (Array.isArray(current)) {
      const joined = collectArrayText(current);
      if (joined) {
        return joined;
      }
    }
  }

  throw new AgentRoutingError("Unexpected response shape from agent provider");
};

const collectRecordText = (record: UnknownRecord, depth: number, parts: string[]): void => {
  const direct = asString(record.text) ?? asString(record.content) ?? asString(record.value);
  if (direct) {
    parts.push(direct);
    return;
  }

  for (const value of Object.values(record)) {
    if (!Array.isArray(value)) {
      continue;
    }
    const nested = collectArrayText(value, depth + 1);
    if (nested) {
      parts.push(nested);
      break;
    }
  }
};

const collectItemText = (item: unknown, depth: number, parts: string[]): void => {
  if (typeof item === "string") {
    const text = asString(item);
    if (text) {
      parts.push(text);
    }
    return;
  }

  if (Array.isArray(item)) {
    const nested = collectArrayText(item, depth + 1);
    if (nested) {
      parts.push(nested);
    }
    return;
  }

  if (isRecord(item)) {
    collectRecordText(item, depth, parts);
  }
};

const collectArrayText = (items: readonly unknown[], depth = 0): string | null => {
  if (depth > 4) {
    return null;
  }

  const parts: string[] = [];
  for (const item of items) {
    collectItemText(item, depth, parts);
  }
  return parts.length > 0 ? parts.join("") : null;
};
