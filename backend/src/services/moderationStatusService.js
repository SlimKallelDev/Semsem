const Post = require("../models/Post");
const User = require("../models/User");
const { POST_STATUS, USER_STATUS } = require("../constants/moderationStatuses");

const applyModerationStatusesToExistingData = async () => {
  const [activateUsers, blockUsers, publishPosts, blockPosts] =
    await Promise.all([
      User.updateMany(
        {
          $or: [
            { status: { $exists: false } },
            { status: null },
            { status: "pending" },
          ],
        },
        { $set: { status: USER_STATUS.ACTIVE } }
      ),
      User.updateMany(
        { status: { $in: ["suspended", "banned"] } },
        { $set: { status: USER_STATUS.BLOCKED } }
      ),
      Post.updateMany(
        {
          $or: [
            { status: { $exists: false } },
            { status: null },
            { status: { $in: ["pending", "approved"] } },
          ],
        },
        { $set: { status: POST_STATUS.PUBLISHED } }
      ),
      Post.updateMany(
        { status: { $in: ["rejected", "archived"] } },
        { $set: { status: POST_STATUS.BLOCKED } }
      ),
    ]);

  const modified =
    activateUsers.modifiedCount +
    blockUsers.modifiedCount +
    publishPosts.modifiedCount +
    blockPosts.modifiedCount;

  if (modified > 0) {
    console.log(`Normalized moderation status for ${modified} records`);
  }
};

module.exports = {
  applyModerationStatusesToExistingData,
};
