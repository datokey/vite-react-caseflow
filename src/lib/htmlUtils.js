import DOMPurify from "dompurify";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "i",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "u",
    "ul",
  ],
  ALLOWED_ATTR: ["class", "data-list", "href", "rel", "target"],
  FORBID_TAGS: ["embed", "iframe", "object", "script", "style"],
};

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export const sanitizeHtml = (html = "") =>
  DOMPurify.sanitize(String(html || ""), SANITIZE_CONFIG);

export const hasHtmlMarkup = (value = "") => HTML_TAG_PATTERN.test(String(value || ""));

const normalizeInlineText = (value) =>
  value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();

const elementChildren = (node) =>
  Array.from(node.childNodes || []).filter(
    (child) => child.nodeType !== Node.COMMENT_NODE,
  );

const getListType = (itemNode, fallbackListType) => {
  const dataList = itemNode.getAttribute?.("data-list");

  if (dataList === "ordered") return "ol";
  if (dataList === "bullet") return "ul";
  if (dataList === "checked") return "checked";
  if (dataList === "unchecked") return "unchecked";

  return fallbackListType;
};

const getListMarker = (listType, index) => {
  if (listType === "ol") return `${index}. `;
  if (listType === "checked") return "[x] ";
  if (listType === "unchecked") return "[ ] ";

  return "- ";
};

const listItemToPlainText = (itemNode, listType, index) => {
  const marker = getListMarker(listType, index);
  const inlineSegments = [];
  const nestedListSegments = [];

  elementChildren(itemNode).forEach((childNode) => {
    const childTag = childNode.tagName?.toLowerCase();

    if (childTag === "ol" || childTag === "ul") {
      nestedListSegments.push(nodeToPlainText(childNode));
      return;
    }

    inlineSegments.push(nodeToPlainText(childNode));
  });

  const line = `${marker}${normalizeInlineText(inlineSegments.join(""))}`;

  return [line, ...nestedListSegments.filter(Boolean)].join("\n");
};

function nodeToPlainText(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return "";

  const tagName = node.tagName?.toLowerCase();

  if (tagName === "br") return "\n";

  if (tagName === "ol" || tagName === "ul") {
    let orderedIndex = 0;

    return Array.from(node.children || [])
      .filter((childNode) => childNode.tagName?.toLowerCase() === "li")
      .map((childNode) => {
        const childListType = getListType(childNode, tagName);
        const itemIndex = childListType === "ol" ? (orderedIndex += 1) : 0;

        return listItemToPlainText(childNode, childListType, itemIndex);
      })
      .join("\n");
  }

  const childText = elementChildren(node).map(nodeToPlainText).join("");

  if (["blockquote", "div", "h1", "h2", "h3", "h4", "li", "p", "pre"].includes(tagName)) {
    return `${normalizeInlineText(childText)}\n`;
  }

  return childText;
}

export const htmlToPlainText = (html = "") => {
  const value = String(html || "");

  if (!hasHtmlMarkup(value)) {
    return value.replace(/\r\n?/g, "\n").trim();
  }

  const sanitizedHtml = sanitizeHtml(value);

  if (typeof window === "undefined" || !window.DOMParser) {
    return sanitizedHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-4]|blockquote|pre)>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const documentFragment = new window.DOMParser().parseFromString(
    `<div>${sanitizedHtml}</div>`,
    "text/html",
  );
  const text = nodeToPlainText(documentFragment.body);

  return text.replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
};
