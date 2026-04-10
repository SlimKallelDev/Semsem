import axios from "axios";
import API_BASE_URL from "./api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

export const startConversation = async ({ user1, user2, petId }) => {
  const response = await API.post("/messages/start", {
    user1,
    user2,
    petId,
  });
  return response.data;
};

export const getUserConversations = async (userId) => {
  const response = await API.get(`/conversations/user/${userId}`);
  return response.data;
};

export const getMessagesByConversation = async (conversationId) => {
  const response = await API.get(`/messages/conversation/${conversationId}`);
  return response.data;
};

export const sendMessage = async (payload) => {
  const response = await API.post("/messages", payload);
  return response.data;
};

export const deleteMessage = async (id) => {
  const response = await API.delete(`/messages/${id}`);
  return response.data;
};

export default {
  startConversation,
  getUserConversations,
  getMessagesByConversation,
  sendMessage,
  deleteMessage,
};