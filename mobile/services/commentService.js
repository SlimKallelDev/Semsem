import axios from "axios";
import API_BASE_URL from "./api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

export const createComment = async (commentData) => {
  try {
    const response = await API.post("/comments", commentData);
    return response.data;
  } catch (error) {
    console.error(
      "createComment error:",
      error?.response?.data || error.message
    );
    throw error;
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
    throw error;
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
    throw error;
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
    throw error;
  }
};

export default {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
};