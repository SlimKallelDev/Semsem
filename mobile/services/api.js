import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { emitAuthExpired } from "./authEvents";

const DEFAULT_API_URL = "https://semsem-072a.onrender.com/api";
const NORMAL_TIMEOUT_MS = 25000;
const COLD_START_TIMEOUT_MS = 105000;
const HEALTH_TIMEOUT_MS = 110000;
const MAX_GET_RETRIES = 2;
let authExpiredNotified = false;
let backendStatus = "unknown";
let healthPromise = null;
const statusListeners = new Set();
const networkRestoredListeners = new Set();
const inFlightGets = new Map();

const publishBackendStatus = (status) => {
  backendStatus = status;
  statusListeners.forEach((listener) => listener(status));
};
export const getBackendStatus = () => backendStatus;
export const subscribeBackendStatus = (listener) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};
export const notifyNetworkRestored = () => networkRestoredListeners.forEach((listener) => listener());
export const subscribeNetworkRestored = (listener) => {
  networkRestoredListeners.add(listener);
  return () => networkRestoredListeners.delete(listener);
};

const isAuthenticationError = (status, message) => {
  const normalizedMessage = String(message || "").toLowerCase();
  return status === 401 ||
    (status === 403 && normalizedMessage.includes("blocked by an administrator")) ||
    normalizedMessage.includes("jwt expired") ||
    normalizedMessage.includes("invalid token") ||
    normalizedMessage.includes("unauthorized");
};

const clearExpiredSession = async (apiMessage = "") => {
  await AsyncStorage.multiRemove(["token", "user"]);
  if (!authExpiredNotified) {
    authExpiredNotified = true;
    const isBlocked = String(apiMessage).toLowerCase().includes("blocked by an administrator");
    emitAuthExpired(isBlocked ? "Your account has been blocked by an administrator." : "Session expired. Please login again.");
  }
};
export const resetAuthExpiredNotice = () => { authExpiredNotified = false; };

const normalizeBaseUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  const trimmed = withProtocol.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};
const envUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
const API_BASE_URL = envUrl || DEFAULT_API_URL;
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export const createApiClient = () => {
  const client = axios.create({ baseURL: API_BASE_URL, timeout: NORMAL_TIMEOUT_MS });
  client.interceptors.request.use(async (config) => {
    const token = config.__semsemSkipAuth ? null : await AsyncStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else if (config.headers) {
      delete config.headers.Authorization;
      delete config.headers.authorization;
    }
    const isHealth = String(config.url || "").includes("/health");
    config.timeout = isHealth ? HEALTH_TIMEOUT_MS :
      (backendStatus !== "awake" && !config.__semsemRetryCount ? COLD_START_TIMEOUT_MS : NORMAL_TIMEOUT_MS);
    return config;
  });

  client.interceptors.response.use((response) => {
    if (String(response.config?.url || "").includes("/health") || response.status < 500) {
      publishBackendStatus("awake");
    }
    return response;
  }, async (error) => {
    const config = error?.config;
    const status = error?.response?.status;
    const apiMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message;
    const authorization = config?.headers?.Authorization || config?.headers?.authorization;
    if (authorization && isAuthenticationError(status, apiMessage)) await clearExpiredSession(apiMessage);

    if (error?.code === "ERR_CANCELED" || axios.isCancel(error) || config?.signal?.aborted) return Promise.reject(error);
    const retryableClientError = [408, 425, 429].includes(status);
    if (status >= 400 && status < 500 && !retryableClientError) return Promise.reject(error);
    const isGet = config && String(config.method || "get").toLowerCase() === "get";
    const retryable = isGet && !config.__semsemNoRetry &&
      (!error.response || status === 408 || status === 425 || status === 429 || status >= 500);
    if (retryable && (config.__semsemRetryCount || 0) < MAX_GET_RETRIES) {
      config.__semsemRetryCount = (config.__semsemRetryCount || 0) + 1;
      config.timeout = NORMAL_TIMEOUT_MS;
      const waitMs = Math.min(1000 * (2 ** (config.__semsemRetryCount - 1)), 4000);
      await new Promise((resolve, reject) => {
        const signal = config.signal;
        const onAbort = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          const canceled = new Error("Request canceled");
          canceled.code = "ERR_CANCELED";
          reject(canceled);
        };
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        }, waitMs);
        if (signal?.aborted) onAbort();
        else signal?.addEventListener("abort", onAbort, { once: true });
      });
      return client.request(config);
    }
    if (!error.response && !isGet) publishBackendStatus("unavailable");
    if (!error.response && isGet) publishBackendStatus("unavailable");
    return Promise.reject(error);
  });
  return client;
};

export const dedupeGet = (key, requestFn) => {
  if (inFlightGets.has(key)) return inFlightGets.get(key);
  const requestPromise = Promise.resolve().then(requestFn).finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, requestPromise);
  return requestPromise;
};

export const checkBackendHealth = () => {
  if (healthPromise) return healthPromise;
  const client = createApiClient();
  publishBackendStatus("checking");
  healthPromise = (async () => {
    try {
      let lastError;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const response = await client.get("/health", { __semsemNoRetry: true });
          if (response.status === 503 && attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** attempt)));
            continue;
          }
          publishBackendStatus("awake");
          return response.data;
        } catch (error) {
          lastError = error;
          if (error?.response?.status === 503 && attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** attempt)));
            continue;
          }
          throw error;
        }
      }
      throw lastError || new Error("Backend is not ready");
    } catch (error) {
      publishBackendStatus("unavailable");
      throw error;
    }
  })().finally(() => { healthPromise = null; });
  return healthPromise;
};

export const request = async (endpoint, options = {}) => {
  const { skipAuth = false, body, ...requestOptions } = options;
  const client = createApiClient();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {
    ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(skipAuth ? { Authorization: undefined } : {}),
    ...(requestOptions.headers || {}),
  };
  const method = String(requestOptions.method || "GET").toLowerCase();
  try {
    const response = await client.request({
      url: endpoint,
      method,
      data: body,
      headers,
      signal: requestOptions.signal,
      params: requestOptions.params,
      timeout: requestOptions.timeout,
      __semsemNoRetry: requestOptions.__semsemNoRetry,
      __semsemSkipAuth: skipAuth,
    });
    return response.data;
  } catch (error) {
    const apiMessage = error?.response?.data?.message || error?.response?.data?.error;
    if (apiMessage) {
      const normalizedError = new Error(apiMessage);
      normalizedError.status = error.response.status;
      normalizedError.response = error.response;
      throw normalizedError;
    }
    throw error;
  }
};

export default API_BASE_URL;
