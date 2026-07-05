const bcrypt = require("bcryptjs");
const dns = require("node:dns");
const mongoose = require("mongoose");

const env = require("../src/config/env");
const User = require("../src/models/User");
const {
  DEFAULT_USER_PROFILE_TYPE,
  isValidProfileType,
} = require("../src/constants/profileTypes");

dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]);

const run = async () => {
  const email = String(process.argv[2] || process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = String(process.argv[3] || process.env.ADMIN_PASSWORD || "");
  const name = String(
    process.argv[4] || process.env.ADMIN_NAME || "Semsem Administrator"
  ).trim();

  if (!email || !password) {
    throw new Error(
      'Usage: npm run create-admin -- "admin@email.com" "password" "Admin Name"'
    );
  }

  if (password.length < 8) {
    throw new Error("Administrator password must contain at least 8 characters");
  }

  await mongoose.connect(env.MONGO_URI);
  const hashedPassword = await bcrypt.hash(password, 12);
  const existingUser = await User.findOne({ email }).select("profileType");
  const profileType = isValidProfileType(existingUser?.profileType)
    ? existingUser.profileType
    : DEFAULT_USER_PROFILE_TYPE;
  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        email,
        password: hashedPassword,
        role: "admin",
        status: "active",
        profileType,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log(`Administrator ready: ${user.email}`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
