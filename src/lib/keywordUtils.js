export const getKeywordId = (keyword) => keyword?._id || keyword?.id;

export const getKeywordLabel = (keyword) => {
  if (typeof keyword === "string") return keyword;
  return keyword?.keyword || keyword?.name || keyword?.title || keyword?.value || "";
};

export const normalizeKeyword = (keyword, overrides = {}) => {
  const label = getKeywordLabel(keyword).trim();

  return {
    id: getKeywordId(keyword),
    label,
    value: label.toLowerCase(),
    isNew: false,
    ...overrides,
  };
};

export const toKeywordPayload = (keyword) => ({
  id: keyword.id,
  _id: keyword.id,
  keyword: keyword.label,
  name: keyword.label,
});

export const toKeywordId = (keyword) => keyword.id;
