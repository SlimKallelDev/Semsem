const dns = require("node:dns");
const http = require("node:http");
const env = require("./config/env");
const { initSocket } = require("./socket");
const {
  applyDefaultProfileTypeToExistingUsers,
} = require("./services/profileTypeService");
const {
  applyModerationStatusesToExistingData,
} = require("./services/moderationStatusService");

// FIX DNS Windows
dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]);

const app = require("./index");
const connectDB = require("./config/db");

const startServer = async () => {
  try {
    await connectDB();
    await applyDefaultProfileTypeToExistingUsers();
    await applyModerationStatusesToExistingData();

    const PORT = env.PORT || 5000;
    const server = http.createServer(app);
    const io = initSocket(server);

    app.set("io", io);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
