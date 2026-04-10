const dns = require("node:dns");
const dotenv = require("dotenv");

dotenv.config();

// FIX DNS Windows
dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]);

const app = require("./index");
const connectDB = require("./config/db");
const env = require("./config/env");

const startServer = async () => {
  try {
    await connectDB();

    const PORT = env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();