import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "./api";

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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

export const getLikesByPost = async (postId) => {
  try {
    const response = await API.get(`/likes/post/${postId}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(
      "getLikesByPost error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message || "Failed to load likes"
    );
  }
};

export const likePost = async (postId) => {
  try {
    const response = await API.post("/likes", { postId });
    return response.data;
  } catch (error) {
    console.error(
      "likePost error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message || "Failed to like post"
    );
  }
};

export const unlikePost = async (postId) => {
  try {
    const response = await API.delete("/likes", {
      data: { postId },
    });
    return response.data;
  } catch (error) {
    console.error(
      "unlikePost error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message || "Failed to unlike post"
    );
  }
};

export const isPostLiked = async (postId, userId) => {
  try {
    const likes = await getLikesByPost(postId);

    return likes.some((like) => {
      const likeUserId = like?.user?._id || like?.user;
      return String(likeUserId) === String(userId);
    });
  } catch (error) {
    console.error(
      "isPostLiked error:",
      error?.response?.data || error.message
    );
    throw new Error(error.message || "Failed to check like status");
  }
};

export const getLikesCount = async (postId) => {
  try {
    const likes = await getLikesByPost(postId);
    return likes.length;
  } catch (error) {
    console.error(
      "getLikesCount error:",
      error?.response?.data || error.message
    );
    throw new Error(error.message || "Failed to get likes count");
  }
};

export const toggleLike = async (postId, userId) => {
  try {
    const liked = await isPostLiked(postId, userId);

    if (liked) {
      return await unlikePost(postId);
    }

    return await likePost(postId);
  } catch (error) {
    console.error(
      "toggleLike error:",
      error?.response?.data || error.message
    );
    throw new Error(error.message || "Failed to toggle like");
  }
};

export default {
  getLikesByPost,
  likePost,
  unlikePost,
  isPostLiked,
  getLikesCount,
  toggleLike,
};
