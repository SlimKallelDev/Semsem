import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import { emitAuthExpired } from "./authEvents";

const DEFAULT_LOCAL_HOST = "192.168.1.20";
const DEFAULT_API_PORT = "5000";
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 1;
let authExpiredNotified = false;

const isAuthenticationError = (status, message) => {
  const normalizedMessage = String(message || "").toLowerCase();

  return (
    status === 401 ||
    (status === 403 && normalizedMessage.includes("blocked by an administrator")) ||
    normalizedMessage.includes("jwt expired") ||
    normalizedMessage.includes("invalid token") ||
    normalizedMessage.includes("unauthorized")
  );
};

const clearExpiredSession = async (apiMessage = "") => {
  await AsyncStorage.multiRemove(["token", "user"]);

  if (!authExpiredNotified) {
    authExpiredNotified = true;
    const isBlocked = String(apiMessage)
      .toLowerCase()
      .includes("blocked by an administrator");
    emitAuthExpired(
      isBlocked
        ? "Your account has been blocked by an administrator."
        : "Session expired. Please login again."
    );
  }
};

export const resetAuthExpiredNotice = () => {
  authExpiredNotified = false;
};

const normalizeBaseUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value)
    ? value
    : `http://${value}`;
  const trimmed = withProtocol.replace(/\/+$/, "");

  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const extractExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";
  const linkUri = Constants.linkingUri || "";

  const hostFromHostUri = String(hostUri).split(":")[0];
  const hostFromLinkUri =
    String(linkUri).match(/:\/\/([^/:]+)/)?.[1] || "";

  return hostFromHostUri || hostFromLinkUri || "";
};

const buildApiBaseUrl = () => {
  const envUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envUrl) return envUrl;

  const expoHost = extractExpoHost();
  if (expoHost) {
    return `http://${expoHost}:${DEFAULT_API_PORT}/api`;
  }

  return `http://${DEFAULT_LOCAL_HOST}:${DEFAULT_API_PORT}/api`;
};

const API_BASE_URL = buildApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

const fetchWithTimeout = async (url, config, timeoutMs) => {
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    return await fetch(url, {
      ...config,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Network request timed out");
    }

    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const request = async (endpoint, options = {}) => {
  let attempt = 0;
  const { skipAuth = false, ...requestOptions } = options;

  while (attempt <= MAX_RETRIES) {
    try {
      const token = skipAuth ? null : await AsyncStorage.getItem("token");
      const isFormData =
        typeof FormData !== "undefined" && requestOptions.body instanceof FormData;

      const headers = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestOptions.headers || {}),
      };

      const response = await fetchWithTimeout(
        `${API_BASE_URL}${endpoint}`,
        { ...requestOptions, headers },
        REQUEST_TIMEOUT_MS
      );

      let data = null;

      try {
        data = await response.json();
      } catch (err) {
        data = null;
      }

      if (!response.ok) {
        const apiMessage = data?.message || data?.error || "Request failed";
        const isUnauthorized = isAuthenticationError(response.status, apiMessage);

        if (isUnauthorized && token) {
          await clearExpiredSession(apiMessage);
        }

        console.log("API ERROR:", {
          endpoint,
          status: response.status,
          message: apiMessage,
          baseURL: API_BASE_URL,
        });

        const error = new Error(apiMessage);
        error.status = response.status;
        error.isHttpError = true;
        throw error;
      }

      return data;
    } catch (error) {
      const message = String(error?.message || "");
      const canRetry =
        attempt < MAX_RETRIES &&
        (message.toLowerCase().includes("timed out") ||
          message.toLowerCase().includes("network request failed"));

      if (canRetry) {
        attempt += 1;
        continue;
      }

      if (!error?.isHttpError) {
        console.log("NETWORK ERROR:", error.message, {
          endpoint,
          baseURL: API_BASE_URL,
        });
      }
      throw error;
    }
  }
};

export const createApiClient = ({ timeout = REQUEST_TIMEOUT_MS } = {}) => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout,
  });

  client.interceptors.request.use(
    async (config) => {
      const token = await AsyncStorage.getItem("token");

      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      } else if (config.headers) {
        delete config.headers.Authorization;
        delete config.headers.authorization;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status;
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      const authorization = error?.config?.headers?.Authorization;

      if (authorization && isAuthenticationError(status, apiMessage)) {
        await clearExpiredSession(apiMessage);
      }

      const config = error?.config;
      const isRetryableGet =
        config &&
        String(config.method || "get").toLowerCase() === "get" &&
        !error?.response &&
        !config.__semsemRetried;

      if (isRetryableGet) {
        config.__semsemRetried = true;
        return client.request(config);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export default API_BASE_URL;
