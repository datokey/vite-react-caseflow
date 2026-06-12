export const queryKeys = {
  articles: {
    all: ["articles"],
    lists: () => [...queryKeys.articles.all, "list"],
    list: (params = {}) => [...queryKeys.articles.lists(), params],
    detail: (id) => [...queryKeys.articles.all, "detail", id],
  },
  keywords: {
    all: ["keywords"],
    search: (query) => [...queryKeys.keywords.all, "search", query],
  },
  sopUsage: {
    all: ["sop-usage"],
    frequentlyUsed: () => [...queryKeys.sopUsage.all, "frequently-used"],
  },
};
