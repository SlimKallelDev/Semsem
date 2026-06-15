import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { emitAuthExpired } from "./authEvents";

const DEFAULT_LOCAL_HOST = "172.20.10.4";
const DEFAULT_API_PORT = "5000";
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 1;
let authExpiredNotified = false;

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

  while (attempt <= MAX_RETRIES) {
    try {
      const token = await AsyncStorage.getItem("token");
      const isFormData =
        typeof FormData !== "undefined" && options.body instanceof FormData;

      const headers = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      };

      const response = await fetchWithTimeout(
        `${API_BASE_URL}${endpoint}`,
        { ...options, headers },
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
        const isUnauthorized =
          response.status === 401 ||
          String(apiMessage).toLowerCase().includes("jwt expired") ||
          String(apiMessage).toLowerCase().includes("invalid token") ||
          String(apiMessage).toLowerCase().includes("unauthorized");

        if (isUnauthorized) {
          await AsyncStorage.multiRemove(["token", "user"]);

          if (!authExpiredNotified) {
            authExpiredNotified = true;
            emitAuthExpired("Session expired. Please login again.");
          }
        }

        console.log("API ERROR:", {
          endpoint,
          status: response.status,
          data,
          baseURL: API_BASE_URL,
        });

        const error = new Error(apiMessage);
        error.status = response.status;
        throw error;
      }

      authExpiredNotified = false;
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

      console.log("NETWORK ERROR:", error.message, {
        endpoint,
        baseURL: API_BASE_URL,
      });
      throw error;
    }
  }
};

export default API_BASE_URL;
