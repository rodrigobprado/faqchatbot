import { describe, expect, it } from "vitest";
import { firstValueFrom, take, toArray } from "rxjs";
import { ChatStreamBroker } from "./chat-stream.broker.js";

describe("ChatStreamBroker", () => {
  it("delivers emitted events to a subscriber of the same conversation", async () => {
    const broker = new ChatStreamBroker();

    const events = firstValueFrom(broker.stream("conversation-1").pipe(take(2), toArray()));

    broker.emit("conversation-1", { type: "typing" });
    broker.emit("conversation-1", { type: "token", token: "Ola" });

    const received = await events;

    expect(received).toEqual([
      { data: JSON.stringify({ type: "typing" }) },
      { data: JSON.stringify({ type: "token", token: "Ola" }) }
    ]);
  });

  it("keeps streams isolated per conversationId", async () => {
    const broker = new ChatStreamBroker();

    const events = firstValueFrom(broker.stream("conversation-a").pipe(take(1)));

    broker.emit("conversation-b", { type: "typing" });
    broker.emit("conversation-a", { type: "token", token: "isolado" });

    const received = await events;

    expect(received).toEqual({ data: JSON.stringify({ type: "token", token: "isolado" }) });
  });
});
