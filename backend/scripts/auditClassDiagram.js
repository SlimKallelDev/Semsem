const Appointment = require("../src/models/Appointment");
const Comment = require("../src/models/Comment");
const Conversation = require("../src/models/Conversation");
const Like = require("../src/models/Like");
const Message = require("../src/models/Message");
const Notification = require("../src/models/Notification");
const Pet = require("../src/models/Pet");
const Post = require("../src/models/Post");
const User = require("../src/models/User");
const UserReview = require("../src/models/UserReview");

const contracts = [
  {
    model: User,
    collection: "users",
    fields: [
      "name",
      "email",
      "password",
      "role",
      "profileType",
      "status",
      "country",
      "governorate",
      "phone",
      "bio",
      "avatar",
      "ratingAverage",
      "ratingCount",
    ],
  },
  {
    model: Pet,
    collection: "pets",
    fields: [
      "owner",
      "name",
      "type",
      "breed",
      "date",
      "description",
      "images",
      "country",
      "governorate",
      "careRecord.updatedAt",
      "careRecord.identityProfile.petName",
      "careRecord.identityProfile.species",
      "careRecord.identityProfile.breed",
      "careRecord.identityProfile.gender",
      "careRecord.identityProfile.birthDateOrAge",
      "careRecord.identityProfile.weight",
      "careRecord.identityProfile.microchipId",
      "careRecord.identityProfile.sterilized",
      "careRecord.medicalHistory.veterinaryVisits",
      "careRecord.medicalHistory.medications",
      "careRecord.vaccinations",
    ],
    refs: { owner: "User" },
  },
  {
    model: UserReview,
    collection: "userreviews",
    fields: ["targetUser", "reviewer", "rating", "review", "createdAt"],
    refs: { targetUser: "User", reviewer: "User" },
  },
  {
    model: Post,
    collection: "posts",
    fields: [
      "user",
      "type",
      "title",
      "description",
      "images",
      "petType",
      "price",
      "currency",
      "status",
      "likesCount",
      "commentsCount",
    ],
    refs: { user: "User" },
  },
  {
    model: Comment,
    collection: "comments",
    fields: ["post", "user", "text", "createdAt"],
    refs: { post: "Post", user: "User" },
  },
  {
    model: Like,
    collection: "likes",
    fields: ["post", "user", "createdAt"],
    refs: { post: "Post", user: "User" },
  },
  {
    model: Conversation,
    collection: "conversations",
    fields: ["participants", "lastMessage", "createdAt", "updatedAt"],
    refs: { participants: "User", lastMessage: "Message" },
  },
  {
    model: Message,
    collection: "messages",
    fields: ["conversation", "sender", "text", "createdAt"],
    refs: { conversation: "Conversation", sender: "User" },
  },
  {
    model: Appointment,
    collection: "appointments",
    fields: [
      "requester",
      "provider",
      "status",
      "note",
      "pets",
      "otherPet",
      "requestedFor",
      "decidedAt",
    ],
    refs: { requester: "User", provider: "User", pets: "Pet" },
  },
  {
    model: Notification,
    collection: "notifications",
    fields: [
      "recipient",
      "type",
      "title",
      "body",
      "resourceType",
      "resourceId",
      "isRead",
      "readAt",
    ],
    refs: { recipient: "User" },
  },
];

const getReference = (schemaPath) =>
  schemaPath?.options?.ref ||
  schemaPath?.embeddedSchemaType?.options?.ref ||
  schemaPath?.caster?.options?.ref ||
  schemaPath?.schema?.options?.ref;

const errors = [];

for (const contract of contracts) {
  const modelName = contract.model.modelName;
  const actualCollection = contract.model.collection.collectionName;

  if (actualCollection !== contract.collection) {
    errors.push(
      `${modelName}: collection "${actualCollection}" instead of "${contract.collection}"`
    );
  }

  for (const field of contract.fields) {
    if (!contract.model.schema.path(field)) {
      errors.push(`${modelName}: missing field "${field}"`);
    }
  }

  for (const [field, expectedRef] of Object.entries(contract.refs || {})) {
    const actualRef = getReference(contract.model.schema.path(field));
    if (actualRef !== expectedRef) {
      errors.push(
        `${modelName}.${field}: ref "${actualRef || "none"}" instead of "${expectedRef}"`
      );
    }
  }
}

if (errors.length) {
  console.error("Class diagram audit failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Class diagram audit passed for ${contracts.length} domain models and their relations.`
  );
}
