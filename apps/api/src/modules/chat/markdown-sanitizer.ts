import type { MessageContent } from "@faqchatbot/contracts";
import sanitizeHtml from "sanitize-html";

const strip = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });

export const sanitizeMessageContent = (content: MessageContent): MessageContent => {
  if (content.type === "text") {
    return { ...content, text: strip(content.text) };
  }

  if (content.type === "markdown") {
    return { ...content, markdown: strip(content.markdown) };
  }

  return content;
};
