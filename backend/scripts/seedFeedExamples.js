const connectDB = require("../src/config/db");
const mongoose = require("mongoose");
const Post = require("../src/models/Post");
const User = require("../src/models/User");
const { POST_TYPES } = require("../src/constants/postTypes");
const { POST_STATUS, USER_STATUS } = require("../src/constants/moderationStatuses");

const EXAMPLE_POSTS = [
  {
    type: POST_TYPES.GENERAL,
    title: "[EXAMPLE] What should I pack for a weekend with my dog?",
    description: "FICTIONAL SAMPLE POST — A friendly example of a community question. What essentials do you bring when travelling with a dog? No real pet or trip is being described.",
    petType: "Dog",
  },
  {
    type: POST_TYPES.ADOPTION,
    title: "[EXAMPLE] Meet a gentle cat looking for a home",
    description: "FICTIONAL SAMPLE POST — This is only an example of an adoption post. There is no real cat available for adoption. Please do not contact the author about this sample.",
    petType: "Cat",
  },
  {
    type: POST_TYPES.LOST,
    title: "[EXAMPLE] Lost pet notice format",
    description: "FICTIONAL SAMPLE — No animal is missing. This example shows how a lost-pet post might be written; it is not a real alert. Include a recent photo, the last-seen area, and a safe contact method in a real notice.",
    petType: "Dog",
  },
  {
    type: POST_TYPES.FOUND,
    title: "[EXAMPLE] Found pet notice format",
    description: "FICTIONAL SAMPLE — No animal has been found. This example shows how a found-pet post might be written; it is not a real alert. In a real case, share the area and contact a local shelter or vet.",
    petType: "Cat",
  },
  {
    type: POST_TYPES.MATING,
    title: "[EXAMPLE] Responsible pet match introduction",
    description: "FICTIONAL SAMPLE POST — An example of the mating category. No real pet is being offered for pairing. A real post should include health and temperament information and prioritize animal welfare.",
    petType: "Dog",
  },
  {
    type: POST_TYPES.SALE,
    title: "[EXAMPLE] Pet carrier listing",
    description: "FICTIONAL SAMPLE POST — This listing is for demonstration only. No carrier is for sale and no payment should be made.",
    petType: "Pet supplies",
    price: 25,
    currency: "TND",
  },
];

async function main() {
  await connectDB();

  const admin = await User.findOne({ role: "admin", status: USER_STATUS.ACTIVE })
    .select("_id country governorate city")
    .lean();

  if (!admin) {
    throw new Error("No active administrator account exists; refusing to publish examples under another user.");
  }

  const country = String(admin.country || "Tunisia").trim() || "Tunisia";
  const governorate = String(admin.governorate || admin.city || "Tunis").trim() || "Tunis";
  let created = 0;
  let skipped = 0;

  for (const example of EXAMPLE_POSTS) {
    const exists = await Post.exists({ user: admin._id, title: example.title });
    if (exists) {
      skipped += 1;
      continue;
    }

    await Post.create({
      ...example,
      user: admin._id,
      images: [],
      location: { country, governorate, city: governorate },
      status: POST_STATUS.PUBLISHED,
    });
    created += 1;
  }

  console.log(`Feed examples complete: ${created} created, ${skipped} already present.`);
}

main()
  .catch((error) => {
    console.error(`Feed example seeding failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
