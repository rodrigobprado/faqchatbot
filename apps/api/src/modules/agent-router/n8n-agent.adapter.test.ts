import { describe, expect, it } from "vitest";
import { N8nAgentAdapter } from "./n8n-agent.adapter.js";

describe("N8nAgentAdapter", () => {
  it("normalizes text, markdown and rich content into text responses", async () => {
    const adapter = new N8nAgentAdapter();

    await expect(
      adapter.route({
        tenantId: "tenant-1",
        conversationId: "conversation-1",
        message: {
          type: "text",
          text: "Ola"
        }
      })
    ).resolves.toMatchObject({
      provider: "n8n",
      content: {
        type: "text",
        text: "Recebi: Ola"
      }
    });

    await expect(
      adapter.route({
        tenantId: "tenant-1",
        conversationId: "conversation-1",
        message: {
          type: "card",
          title: "Plano"
        }
      })
    ).resolves.toMatchObject({
      content: {
        type: "text",
        text: "Recebi seu card: Plano"
      }
    });
  });
});
