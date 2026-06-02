import { useMemo } from "react";
import { sanitizeHtml } from "../lib/htmlUtils";

export default function SanitizedHtmlRenderer({ html, className = "" }) {
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  if (!sanitizedHtml) return null;

  return (
    <div
      className={`template-chat-content prose prose-sm prose-slate max-w-none dark:prose-invert prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-1 prose-strong:text-slate-900 dark:prose-strong:text-white ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
