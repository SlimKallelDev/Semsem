import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "./api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export const getPosts = async (filters = {}) => {
  try {
    const params = {};

    if (filters.country) params.country = filters.country;
    if (filters.city) params.city = filters.city;

    const response = await API.get("/posts", { params });
    return response.data;
  } catch (error) {
    console.error("getPosts error:", error?.response?.data || error.message);
    throw new Error(error?.response?.data?.message || "Failed to load posts");
  }
};

export const getPostById = async (postId) => {
  try {
    const response = await API.get(`/posts/${postId}`);
    return response.data;
  } catch (error) {
    console.error("getPostById error:", error?.response?.data || error.message);
    throw new Error(error?.response?.data?.message || "Failed to load post");
  }
};

export const getPostsByUser = async (userId) => {
  try {
    const response = await API.get(`/posts/user/${userId}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(
      "getPostsByUser error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message || "Failed to load user posts"
    );
  }
};

export const createPost = async (data) => {
  try {
    const response = await API.post("/posts", data);
    return response.data;
  } catch (error) {
    console.error("createPost error:", error?.response?.data || error.message);
    throw new Error(error?.response?.data?.message || "Failed to create post");
  }
};

export const updatePost = async (postId, data) => {
  try {
    const response = await API.put(`/posts/${postId}`, data);
    return response.data;
  } catch (error) {
    console.error("updatePost error:", error?.response?.data || error.message);
    throw new Error(error?.response?.data?.message || "Failed to update post");
  }
};

export const deletePost = async (postId) => {
  try {
    const response = await API.delete(`/posts/${postId}`);
    return response.data;
  } catch (error) {
    console.error("deletePost error:", error?.response?.data || error.message);
    throw new Error(error?.response?.data?.message || "Failed to delete post");
  }
};

export default {
  getPosts,
  getPostById,
  getPostsByUser,
  createPost,
  updatePost,
  deletePost,
};
