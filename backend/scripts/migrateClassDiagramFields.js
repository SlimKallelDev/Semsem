const mongoose = require("mongoose");

const env = require("../src/config/env");

const migrate = async () => {
  if (!env.MONGO_URI) {
    throw new Error("MONGO_URI is required to run the class diagram migration");
  }

  await mongoose.connect(env.MONGO_URI);

  const posts = mongoose.connection.collection("posts");
  const pets = mongoose.connection.collection("pets");

  const postResult = await posts.updateMany(
    {},
    [
      {
        $set: {
          petType: { $ifNull: ["$petType", { $ifNull: ["$pet_type", ""] }] },
          likesCount: {
            $ifNull: ["$likesCount", { $ifNull: ["$likes_count", 0] }],
          },
          commentsCount: {
            $ifNull: ["$commentsCount", { $ifNull: ["$comments_count", 0] }],
          },
        },
      },
    ]
  );

  await posts.updateMany(
    {},
    {
      $unset: {
        pet_type: "",
        likes_count: "",
        comments_count: "",
      },
    }
  );

  const petResult = await pets.updateMany(
    {},
    [
      {
        $set: {
          country: {
            $ifNull: ["$country", { $ifNull: ["$location.country", ""] }],
          },
          governorate: {
            $ifNull: [
              "$governorate",
              {
                $ifNull: [
                  "$location.governorate",
                  { $ifNull: ["$location.city", { $ifNull: ["$city", ""] }] },
                ],
              },
            ],
          },
        },
      },
    ]
  );

  await pets.updateMany({}, { $unset: { location: "", city: "" } });

  console.log(
    `Migration complete: ${postResult.modifiedCount} posts and ${petResult.modifiedCount} pets updated.`
  );
};

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
