import { createApiClient } from "./api";

const API = createApiClient();

export const createComment = async (commentData) => {
  try {
    const response = await API.post("/comments", commentData);
    return response.data;
  } catch (error) {
    console.error(
      "createComment error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to create comment"
    );
  }
};

export const getCommentsByPost = async (postId) => {
  try {
    const response = await API.get(`/comments/post/${postId}`);
    return response.data;
  } catch (error) {
    console.error(
      "getCommentsByPost error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to load comments"
    );
  }
};

export const getMyComments = async () => {
  try {
    const response = await API.get("/comments/me");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(
      "getMyComments error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to load your comments"
    );
  }
};

export const updateComment = async (id, text) => {
  try {
    const response = await API.put(`/comments/${id}`, { text });
    return response.data;
  } catch (error) {
    console.error(
      "updateComment error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to update comment"
    );
  }
};

export const deleteComment = async (id) => {
  try {
    const response = await API.delete(`/comments/${id}`);
    return response.data;
  } catch (error) {
    console.error(
      "deleteComment error:",
      error?.response?.data || error.message
    );
    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to delete comment"
    );
  }
};

export default {
  createComment,
  getCommentsByPost,
  getMyComments,
  updateComment,
  deleteComment,
};
