import { htmlToPlainText } from "./htmlUtils";

export const HANDLING_ITEM_TYPES = {
  instruction: "instruction",
  note: "note",
  template: "template",
};

export const HANDLING_ITEM_LABELS = {
  [HANDLING_ITEM_TYPES.instruction]: "Internal Instruction",
  [HANDLING_ITEM_TYPES.template]: "Template Chat",
  [HANDLING_ITEM_TYPES.note]: "Catatan",
};

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export const hasHandlingHtmlMarkup = (value = "") => HTML_TAG_PATTERN.test(String(value || ""));

const createClientId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const normalizeHandlingItemType = (type) => {
  const value = String(type || "").trim().toLowerCase();

  if (["template", "templatechat", "template_chat", "chat", "message"].includes(value)) {
    return HANDLING_ITEM_TYPES.template;
  }

  if (["catatan", "note", "notes", "warning", "warnings"].includes(value)) {
    return HANDLING_ITEM_TYPES.note;
  }

  return HANDLING_ITEM_TYPES.instruction;
};

export const createHandlingItem = (type = HANDLING_ITEM_TYPES.instruction) => ({
  id: createClientId("item"),
  type: normalizeHandlingItemType(type),
  content: "",
});

export const createEmptyHandlingStep = () => ({
  id: createClientId("handling"),
  judulPenanganan: "",
  items: [createHandlingItem(HANDLING_ITEM_TYPES.instruction)],
});

export const hasHandlingItemContent = (item) => Boolean(htmlToPlainText(item?.content || "").trim());

const normalizeTextLines = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const normalizeInstructionPayload = (value) => {
  if (Array.isArray(value)) {
    const cleanedItems = value.map((item) => String(item || "").trim()).filter(Boolean);

    if (cleanedItems.length === 1 && hasHandlingHtmlMarkup(cleanedItems[0])) {
      return [cleanedItems[0]];
    }

    return cleanedItems;
  }

  if (typeof value === "string" && hasHandlingHtmlMarkup(value)) {
    return value.trim() ? [value.trim()] : [];
  }

  return normalizeTextLines(value);
};

export const instructionValueToForm = (value) => {
  if (Array.isArray(value)) {
    return value.length === 1 && hasHandlingHtmlMarkup(value[0])
      ? value[0]
      : value.join("\n");
  }

  return value || "";
};

const getFirstValue = (source, keys) => {
  if (!source || typeof source !== "object") return undefined;

  return keys
    .map((key) => source[key])
    .find((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "string") return value.trim();
      return value !== undefined && value !== null;
    });
};

const normalizeItemObject = (item = {}, index = 0) => ({
  id: item?._id || item?.id || createClientId(`item-${index}`),
  type: normalizeHandlingItemType(item?.type || item?.kind || item?.componentType || item?.itemType),
  content:
    item?.content ??
    item?.value ??
    item?.text ??
    item?.html ??
    item?.templateChat ??
    item?.instruksiInternal ??
    item?.catatan ??
    "",
});

export const getHandlingItems = (step = {}) => {
  const explicitItems = getFirstValue(step, ["items", "item", "sections", "components", "contents"]);

  if (Array.isArray(explicitItems) && explicitItems.length > 0) {
    return explicitItems.map(normalizeItemObject).filter(hasHandlingItemContent);
  }

  const items = [];
  const instruction = getFirstValue(step, [
    "instruksiInternal",
    "instruksi",
    "instructions",
    "langkah",
    "steps",
    "checklist",
  ]);
  const template = getFirstValue(step, [
    "templateChat",
    "template",
    "chatTemplate",
    "template_chat",
    "messageTemplate",
  ]);
  const note = getFirstValue(step, [
    "catatan",
    "Catatan",
    "note",
    "notes",
    "warning",
    "warnings",
  ]);

  if (instruction !== undefined && instruction !== null) {
    items.push({
      id: createClientId("instruction"),
      type: HANDLING_ITEM_TYPES.instruction,
      content: instructionValueToForm(instruction),
    });
  }

  if (template !== undefined && template !== null) {
    items.push({
      id: createClientId("template"),
      type: HANDLING_ITEM_TYPES.template,
      content: template || "",
    });
  }

  if (note !== undefined && note !== null) {
    const notes = Array.isArray(note) ? note : [note];
    notes.forEach((item) => {
      items.push({
        id: createClientId("note"),
        type: HANDLING_ITEM_TYPES.note,
        content: instructionValueToForm(item),
      });
    });
  }

  return items.filter(hasHandlingItemContent);
};

export const normalizeHandlingStepForForm = (step = {}) => {
  const normalizedItems = getHandlingItems(step);

  return {
    _id: step?._id || step?.id,
    id: step?.id || step?._id || createClientId("handling"),
    judulPenanganan: step?.judulPenanganan || step?.judul || step?.title || "",
    instruksiInternal: instructionValueToForm(step?.instruksiInternal),
    templateChat: step?.templateChat || "",
    items: normalizedItems.length ? normalizedItems : [createHandlingItem(HANDLING_ITEM_TYPES.instruction)],
  };
};

export const buildHandlingStepPayload = (step = {}) => {
  const items = (Array.isArray(step.items) ? step.items : getHandlingItems(step))
    .map((item) => ({
      type: normalizeHandlingItemType(item.type),
      content: item.content || "",
    }))
    .filter(hasHandlingItemContent);
  const firstInstruction = items.find((item) => item.type === HANDLING_ITEM_TYPES.instruction);
  const firstTemplate = items.find((item) => item.type === HANDLING_ITEM_TYPES.template);
  const notes = items.filter((item) => item.type === HANDLING_ITEM_TYPES.note).map((item) => item.content);

  return {
    judulPenanganan: step.judulPenanganan || "",
    instruksiInternal: normalizeInstructionPayload(firstInstruction?.content || ""),
    templateChat: firstTemplate?.content || "",
    catatan: notes,
    items,
  };
};
