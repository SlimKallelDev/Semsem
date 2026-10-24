const User = require("../models/User");
const {
  DEFAULT_USER_PROFILE_TYPE,
  USER_PROFILE_TYPE_VALUES,
} = require("../constants/profileTypes");

const applyDefaultProfileTypeToExistingUsers = async () => {
  const result = await User.updateMany(
    {
      $or: [
        { profileType: { $exists: false } },
        { profileType: null },
        { profileType: "" },
        { profileType: { $nin: USER_PROFILE_TYPE_VALUES } },
      ],
    },
    { $set: { profileType: DEFAULT_USER_PROFILE_TYPE } }
  );

  const modifiedCount =
    result?.modifiedCount ?? result?.nModified ?? result?.n ?? 0;

  if (modifiedCount > 0) {
    console.log(
      `Backfilled default profile type for ${modifiedCount} existing user(s).`
    );
  }

  const ratingBackfillResult = await User.updateMany(
    {
      $or: [
        { ratingAverage: { $exists: false } },
        { ratingAverage: null },
        { ratingCount: { $exists: false } },
        { ratingCount: null },
      ],
    },
    {
      $set: {
        ratingAverage: 0,
        ratingCount: 0,
      },
    }
  );

  const ratingBackfilledCount =
    ratingBackfillResult?.modifiedCount ??
    ratingBackfillResult?.nModified ??
    ratingBackfillResult?.n ??
    0;

  if (ratingBackfilledCount > 0) {
    console.log(
      `Backfilled rating stats for ${ratingBackfilledCount} existing user(s).`
    );
  }
};

module.exports = {
  applyDefaultProfileTypeToExistingUsers,
};
