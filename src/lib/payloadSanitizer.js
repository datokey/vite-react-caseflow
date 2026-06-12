const DATA_IMAGE_PATTERN = /data:image\/[a-zA-Z0-9.+-]+;base64,/i;
const DATA_IMAGE_TAG_PATTERN =
  /<img\b[^>]*\bsrc\s*=\s*(?:"data:image\/[^"]*"|'data:image\/[^']*'|data:image\/[^\s>]+)[^>]*>/gi;
const DATA_IMAGE_ATTRIBUTE_PATTERN =
  /\s(?:src|href)\s*=\s*(?:"data:image\/[^"]*"|'data:image\/[^']*'|data:image\/[^\s>]+)/gi;
const DATA_IMAGE_CSS_URL_PATTERN = /url\(\s*(?:"data:image\/[^"]*"|'data:image\/[^']*'|data:image\/[^)]*)\s*\)/gi;

export const hasEmbeddedDataImage = (value) =>
  typeof value === "string" && DATA_IMAGE_PATTERN.test(value);

export const stripEmbeddedDataImages = (value) => {
  if (typeof value !== "string" || !hasEmbeddedDataImage(value)) return value;

  return value
    .replace(DATA_IMAGE_TAG_PATTERN, "")
    .replace(DATA_IMAGE_ATTRIBUTE_PATTERN, "")
    .replace(DATA_IMAGE_CSS_URL_PATTERN, "none");
};
