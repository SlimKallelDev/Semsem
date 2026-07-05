const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  BLOCKED: "blocked",
});

const POST_STATUS = Object.freeze({
  PUBLISHED: "published",
  BLOCKED: "blocked",
});

const USER_STATUS_VALUES = Object.freeze(Object.values(USER_STATUS));
const POST_STATUS_VALUES = Object.freeze(Object.values(POST_STATUS));

module.exports = {
  USER_STATUS,
  USER_STATUS_VALUES,
  POST_STATUS,
  POST_STATUS_VALUES,
};
