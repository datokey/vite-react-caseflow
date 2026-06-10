import { apiRequest } from "../lib/apiClient";

const RECORDING_ENDPOINTS = {
  today: import.meta.env.VITE_ENDPOINT_RECORDING_TODAY,
  increment: import.meta.env.VITE_ENDPOINT_RECORDING_INCREMENT,
  decrement: import.meta.env.VITE_ENDPOINT_RECORDING_DECREMENT,
  reset: import.meta.env.VITE_ENDPOINT_RECORDING_RESET,
};

const CHANNEL_KEYS = ["wa-cc", "wa-g", "email", "livechat", "tiktok", "fb", "x", "ig", "call"];
const CHANNEL_ALIASES = {
  facebook: "fb",
  instagram: "ig",
  "live chat": "livechat",
  phone: "call",
  twitter: "x",
  wa: "wa-cc",
  "wa cc": "wa-cc",
  "wa g": "wa-g",
  "wa-cc": "wa-cc",
  "wa-g": "wa-g",
  whatsapp: "wa-cc",
  "whatsapp cc": "wa-cc",
  "whatsapp g": "wa-g",
  "whatsapp-cc": "wa-cc",
  "whatsapp-g": "wa-g",
  whatsappcc: "wa-cc",
  whatsappg: "wa-g",
};

const toCounterNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;
};

const readCounterValue = (item) =>
  item?.count ?? item?.counter ?? item?.total ?? item?.value ?? item?.jumlah ?? item?.tickets ?? 0;

const readChannelKey = (item) =>
  normalizeChannelKey(item?.channel ?? item?.name ?? item?.key ?? item?.type ?? "");

const normalizeChannelKey = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return CHANNEL_ALIASES[normalized] || normalized;
};

const buildQueryString = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `?${queryString}` : "";
};

const normalizeCounters = (data) => {
  const source =
    data?.recording ??
    data?.recordings ??
    data?.counters ??
    data?.counts ??
    data?.today ??
    data?.data?.recording ??
    data?.data?.recordings ??
    data?.data?.counters ??
    data?.data?.counts ??
    data?.data?.today ??
    data?.data ??
    data;

  const counters = CHANNEL_KEYS.reduce((result, channel) => {
    result[channel] = 0;
    return result;
  }, {});

  if (Array.isArray(source)) {
    source.forEach((item) => {
      const channel = readChannelKey(item);

      if (channel in counters) {
        counters[channel] = toCounterNumber(readCounterValue(item));
      }
    });

    return counters;
  }

  if (source && typeof source === "object") {
    CHANNEL_KEYS.forEach((channel) => {
      counters[channel] = toCounterNumber(
        source[channel] ??
          source[channel.toUpperCase()] ??
          source[channel.toLowerCase()] ??
          source[channel.replace(/-/g, "")],
      );
    });

    if (!counters["wa-cc"]) {
      counters["wa-cc"] = toCounterNumber(source.whatsapp ?? source.WhatsApp ?? source.WHATSAPP ?? source.waCc);
    }
    if (!counters["wa-g"]) {
      counters["wa-g"] = toCounterNumber(source.waG ?? source.whatsappG ?? source["whatsapp-g"]);
    }
  }

  return counters;
};

const readTrendDate = (item) =>
  item?.date ?? item?.tanggal ?? item?.day ?? item?.label ?? item?.createdAt ?? "";

const normalizeTrend = (data) => {
  const source =
    data?.trend ??
    data?.trends ??
    data?.daily ??
    data?.monthly ??
    data?.days ??
    data?.data?.trend ??
    data?.data?.trends ??
    data?.data?.daily ??
    data?.data?.monthly ??
    data?.data?.days ??
    [];

  if (source && typeof source === "object" && !Array.isArray(source)) {
    return Object.entries(source)
      .map(([date, value]) => ({
        date,
        total: toCounterNumber(readCounterValue(value && typeof value === "object" ? value : { count: value })),
      }))
      .filter((item) => item.date);
  }

  if (!Array.isArray(source)) return [];

  return source
    .map((item, index) => ({
      date: String(readTrendDate(item) || index + 1),
      total: toCounterNumber(readCounterValue(item)),
    }))
    .filter((item) => item.date);
};

const normalizeStatistics = (data) => ({
  counters: normalizeCounters(data),
  trend: normalizeTrend(data),
});

const getCounterFromResponse = (data, channel, fallbackValue) => {
  const counters = normalizeCounters(data);
  const normalizedChannel = normalizeChannelKey(channel);

  return counters[normalizedChannel] || toCounterNumber(data?.count ?? data?.counter ?? data?.total ?? data?.data?.count ?? data?.data?.counter ?? fallbackValue);
};

const buildChannelPayload = (channel) => ({
  channel,
});

export const recordingService = {
  async getTodayCounters() {
    const data = await apiRequest(RECORDING_ENDPOINTS.today, {
      method: "GET",
      credentials: "include",
    });

    return normalizeCounters(data);
  },

  async getStatistics(period = "daily") {
    const data = await apiRequest(`${RECORDING_ENDPOINTS.today}${buildQueryString({ period })}`, {
      method: "GET",
      credentials: "include",
    });

    return normalizeStatistics(data);
  },

  async increment(channel, fallbackValue = 0) {
    const data = await apiRequest(RECORDING_ENDPOINTS.increment, {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify(buildChannelPayload(channel)),
    });

    return getCounterFromResponse(data, channel, fallbackValue + 1);
  },

  async decrement(channel, fallbackValue = 0) {
    const data = await apiRequest(RECORDING_ENDPOINTS.decrement, {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify(buildChannelPayload(channel)),
    });

    return getCounterFromResponse(data, channel, Math.max(0, fallbackValue - 1));
  },

  async reset() {
    const data = await apiRequest(RECORDING_ENDPOINTS.reset, {
      method: "PATCH",
      credentials: "include",
    });

    return normalizeCounters(data);
  },
};
