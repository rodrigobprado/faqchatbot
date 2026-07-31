import { Injectable, type MessageEvent } from "@nestjs/common";
import { Subject, type Observable } from "rxjs";

// ponytail: in-memory, single-process broker. Move to Redis pub/sub if the API
// ever runs more than one instance behind the widget's SSE connections.
@Injectable()
export class ChatStreamBroker {
  private readonly subjects = new Map<string, Subject<MessageEvent>>();

  stream(conversationId: string): Observable<MessageEvent> {
    return this.getOrCreate(conversationId).asObservable();
  }

  emit(conversationId: string, payload: unknown): void {
    this.getOrCreate(conversationId).next({ data: JSON.stringify(payload) });
  }

  private getOrCreate(conversationId: string): Subject<MessageEvent> {
    let subject = this.subjects.get(conversationId);
    if (!subject) {
      subject = new Subject<MessageEvent>();
      this.subjects.set(conversationId, subject);
    }

    return subject;
  }
}
