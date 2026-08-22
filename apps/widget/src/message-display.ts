import type { MessageContent } from "@faqchatbot/contracts";

const MAX_DISPLAY_LENGTH = 2000;

export const describeMessageContent = (content: MessageContent): string => {
  const truncate = (text: string) =>
    text.length > MAX_DISPLAY_LENGTH ? `${text.slice(0, MAX_DISPLAY_LENGTH)}...` : text;

  switch (content.type) {
    case "text":
      return truncate(content.text);
    case "markdown":
      return truncate(content.markdown);
    case "quick_replies":
      return truncate(content.text);
    case "card":
      return truncate([content.title, content.description].filter(Boolean).join(" — "));
    case "carousel":
      return truncate(
        content.items
          .map((item) => [item.title, item.description].filter(Boolean).join(" — "))
          .join("\n"),
      );
    case "table":
      return truncate(
        [content.columns.join(" | "), ...content.rows.map((row) => row.join(" | "))].join("\n"),
      );
    case "form":
      return truncate(`${content.title} (${content.fields.map((field) => field.label).join(", ")})`);
    case "calendar":
      return truncate(`${content.title} — ${content.availableSlots.length} horarios`);
    case "location":
      return truncate(content.label ?? `${content.latitude}, ${content.longitude}`);
    case "image":
    case "video":
    case "audio":
    case "file":
      return truncate(content.title ?? content.url);
    case "typing":
    case "error":
    case "system":
      return truncate(content.text ?? "");
    default:
      return "";
  }
};
