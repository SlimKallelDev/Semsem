const { Server } = require("socket.io");

function resolveConversationId(payload) {
  if (!payload) return null;

  return (
    payload.conversationId ||
    payload?.conversation?._id ||
    payload?.conversation ||
    null
  );
}

function toConversationRoom(conversationId) {
  return String(conversationId || "").trim();
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_conversation", (conversationId) => {
      const room = toConversationRoom(conversationId);
      if (!room) return;
      socket.join(room);
    });

    socket.on("leave_conversation", (conversationId) => {
      const room = toConversationRoom(conversationId);
      if (!room) return;
      socket.leave(room);
    });

    socket.on("send_message", (payload = {}) => {
      const room = toConversationRoom(resolveConversationId(payload));
      if (!room) return;

      socket.to(room).emit("receive_message", {
        ...payload,
        conversationId: room,
      });
    });

    socket.on("typing_start", (payload = {}) => {
      const room = toConversationRoom(resolveConversationId(payload));
      if (!room) return;

      socket.to(room).emit("typing_start", {
        conversationId: room,
        userId: payload.userId || null,
        userName: payload.userName || "",
      });
    });

    socket.on("typing_stop", (payload = {}) => {
      const room = toConversationRoom(resolveConversationId(payload));
      if (!room) return;

      socket.to(room).emit("typing_stop", {
        conversationId: room,
        userId: payload.userId || null,
        userName: payload.userName || "",
      });
    });
  });

  return io;
}

module.exports = {
  initSocket,
};
