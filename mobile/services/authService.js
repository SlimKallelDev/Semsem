import AsyncStorage from "@react-native-async-storage/async-storage";
import { request } from "./api";

const login = async (email, password) => {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data?.token) {
    await AsyncStorage.setItem("token", data.token);
  }

  if (data?.user) {
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
};

const register = async (
  name,
  email,
  password,
  profileType,
  profileDetails = {}
) => {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      profileType,
      ...profileDetails,
    }),
  });

  if (data?.token) {
    await AsyncStorage.setItem("token", data.token);
  }

  if (data?.user) {
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
};

const logout = async () => {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
};

const getStoredUser = async () => {
  const rawUser = await AsyncStorage.getItem("user");
  return rawUser ? JSON.parse(rawUser) : null;
};

const getStoredToken = async () => {
  return await AsyncStorage.getItem("token");
};

export default {
  login,
  register,
  logout,
  getStoredUser,
  getStoredToken,
};
