import { io } from "socket.io-client";
import { API_ORIGIN } from "./api";

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(API_ORIGIN, {
      transports: ["websocket"], // important for React Native
    });

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
