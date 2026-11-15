import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "@semsem/exchange-rates-v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const memoryCache = new Map();
const pendingRequests = new Map();

export const formatCurrencyAmount = (amount, currency, locale = "en-GB") => {
  const value = Number(amount);
  const code = String(currency || "EUR").toUpperCase();
  if (!Number.isFinite(value)) return "";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
};

const readCachedRates = async (base) => {
  const inMemory = memoryCache.get(base);
  if (inMemory && Date.now() - inMemory.fetchedAt < MAX_AGE_MS) return inMemory.rates;

  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}:${base}`);
    const cached = raw ? JSON.parse(raw) : null;
    if (cached?.rates) {
      memoryCache.set(base, cached);
      if (Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached.rates;
    }
  } catch (error) {
    console.log("Read exchange-rate cache error:", error?.message || error);
  }

  return null;
};

const fetchLatestRates = async (base) => {
  const cached = await readCachedRates(base);
  if (cached) return cached;
  if (pendingRequests.has(base)) return pendingRequests.get(base);

  const request = fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Exchange rates unavailable (${response.status})`);
      const data = await response.json();
      if (data?.result !== "success") throw new Error("Exchange rates unavailable");
      const rates = Object.fromEntries(Object.entries(data?.rates || {}).map(([code, rate]) => [code.toUpperCase(), Number(rate)]));
      if (Object.keys(rates).length === 0) throw new Error("No exchange rates returned");

      const entry = { fetchedAt: Date.now(), rates };
      memoryCache.set(base, entry);
      AsyncStorage.setItem(`${CACHE_KEY}:${base}`, JSON.stringify(entry)).catch(() => {});
      return rates;
    })
    .finally(() => pendingRequests.delete(base));

  pendingRequests.set(base, request);
  return request;
};

export const convertCurrencyAmount = async (amount, fromCurrency, toCurrency) => {
  const value = Number(amount);
  const from = String(fromCurrency || "").toUpperCase();
  const to = String(toCurrency || "").toUpperCase();
  if (!Number.isFinite(value) || !from || !to) return null;
  if (from === to) return value;

  try {
    const rates = await fetchLatestRates(from);
    const rate = Number(rates[to]);
    return Number.isFinite(rate) && rate > 0 ? value * rate : null;
  } catch (error) {
    console.log("Convert currency error:", error?.message || error);
    return null;
  }
};
