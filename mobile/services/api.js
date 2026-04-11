import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://172.20.10.4:5000/api"; // garde ton IP

export const request = async (endpoint, options = {}) => {
  try {
    const token = await AsyncStorage.getItem("token");

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data = null;

    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }

    if (!response.ok) {
      console.log("API ERROR:", {
        endpoint,
        status: response.status,
        data,
      });

      throw new Error(data?.message || data?.error || "Request failed");
    }

    return data;
  } catch (error) {
    console.log("NETWORK ERROR:", error.message);
    throw error;
  }
};

export default API_BASE_URL;