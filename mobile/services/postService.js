import { createApiClient } from "./api";

const API = createApiClient();

const FILE_URI_PATTERN = /^(file|content|ph|assets-library|asset):\/\//i;
const HTTP_URL_PATTERN = /^https?:\/\//i;

const MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

const isLocalImageUri = (value) => {
  if (typeof value !== "string") return false;
  return FILE_URI_PATTERN.test(value.trim());
};

const getImageNameFromUri = (uri, prefix = "post") => {
  const rawName = String(uri || "")
    .split("?")[0]
    .split("/")
    .pop();

  if (rawName && /\.[a-zA-Z0-9]+$/.test(rawName)) {
    return rawName;
  }

  return `${prefix}-${Date.now()}.jpg`;
};

const getImageMimeType = (uri) => {
  const extension = String(uri || "").split(".").pop()?.toLowerCase();
  return MIME_BY_EXTENSION[extension] || "image/jpeg";
};

const appendField = (formData, key, value) => {
  if (value === undefined || value === null) return;
  formData.append(key, String(value));
};

const normalizeImagesInput = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  return [];
};

const resolvePayloadImages = (payload = {}) => {
  const fromImages = normalizeImagesInput(payload.images);
  if (fromImages.length > 0) return fromImages;
  return normalizeImagesInput(payload.image);
};

const buildPostFormData = (payload = {}) => {
  const formData = new FormData();

  appendField(formData, "type", payload.type);
  appendField(formData, "title", payload.title);
  appendField(formData, "description", payload.description);
  appendField(formData, "pet_type", payload.pet_type);
  appendField(formData, "price", payload.price);
  appendField(formData, "currency", payload.currency);

  if (payload.location !== undefined) {
    formData.append("location", JSON.stringify(payload.location || {}));
  }

  const images = resolvePayloadImages(payload);
  images.forEach((imageUri) => {
    if (isLocalImageUri(imageUri)) {
      formData.append("images", {
        uri: imageUri,
        name: getImageNameFromUri(imageUri, "post"),
        type: getImageMimeType(imageUri),
      });
      return;
    }

    if (HTTP_URL_PATTERN.test(imageUri)) {
      formData.append("images", imageUri);
    }
  });

  if (images.length === 0 && payload.image !== undefined) {
    formData.append("image", String(payload.image || "").trim());
  }

  if (Array.isArray(payload.images) && payload.images.length === 0) {
    formData.append("images", "");
  }

  return formData;
};

export const getPosts = async (filters = {}) => {
  try {
    const params = {};

    if (filters.country) params.country = filters.country;
    if (filters.governorate) params.governorate = filters.governorate;

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
    const payload = buildPostFormData(data);

    const response = await API.post("/posts", payload);
    return response.data;
  } catch (error) {
    console.error("createPost error:", error?.response?.data || error.message);
    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to create post"
    );
  }
};

export const updatePost = async (postId, data) => {
  try {
    const payload = buildPostFormData(data);

    const response = await API.put(`/posts/${postId}`, payload);
    return response.data;
  } catch (error) {
    console.error("updatePost error:", error?.response?.data || error.message);
    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to update post"
    );
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

export const getMyPosts = async () => {
  try {
    const response = await API.get("/posts/me");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("getMyPosts error:", error?.response?.data || error.message);
    throw new Error(
      error?.response?.data?.message || "Failed to load your posts"
    );
  }
};

export const reportPost = async (postId, data) => {
  try {
    const response = await API.post(`/posts/${postId}/reports`, data);
    return response.data;
  } catch (error) {
    console.error("reportPost error:", error?.response?.data || error.message);
    throw new Error(
      error?.response?.data?.message || "Failed to submit report"
    );
  }
};

export default {
  getPosts,
  getPostById,
  getPostsByUser,
  getMyPosts,
  createPost,
  updatePost,
  deletePost,
  reportPost,
};

