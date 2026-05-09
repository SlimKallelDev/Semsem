import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useUser } from "../../contexts/UserContext";
import {
  getLikesCount,
  isPostLiked,
  likePost,
  unlikePost,
} from "../../services/likeService";
import {
  formatUserTypeRatingWithCount,
  isVeterinaryUser,
} from "../../constants/userDisplay";
import ThemedText from "../ThemedText";

const CATEGORY_STYLES = {
  adoption: {
    label: "ADOPTION",
    backgroundColor: "#FFFFFF",
    borderColor: "#E1EBF8",
    textColor: "#2A6AB0",
    icon: "home",
    iconColor: "#D9754F",
  },
  lost: {
    label: "LOST",
    backgroundColor: "#FFE9EE",
    borderColor: "#FFD5DE",
    textColor: "#C44761",
    icon: "alert-circle",
    iconColor: "#D05A5A",
  },
  found: {
    label: "FOUND",
    backgroundColor: "#EFF7FF",
    borderColor: "#D8E8FA",
    textColor: "#3679B7",
    icon: "search",
    iconColor: "#5B82C2",
  },
  mating: {
    label: "MATING",
    backgroundColor: "#FFF0F6",
    borderColor: "#FFD9E8",
    textColor: "#BF5686",
    icon: "heart",
    iconColor: "#D9649A",
  },
  general: {
    label: "GENERAL",
    backgroundColor: "#F3FBF5",
    borderColor: "#DDEEE1",
    textColor: "#3C9C5A",
    icon: "paw",
    iconColor: "#3C9C5A",
  },
};

const STATUS_STYLES = {
  pending: {
    backgroundColor: "#FFF4E6",
    textColor: "#E28A1A",
  },
  active: {
    backgroundColor: "#EAF7EE",
    textColor: "#2A9448",
  },
  closed: {
    backgroundColor: "#F0F1F2",
    textColor: "#788089",
  },
};

function getCategoryMeta(type) {
  return CATEGORY_STYLES[(type || "general").toLowerCase()] || CATEGORY_STYLES.general;
}

function getStatusMeta(status) {
  return STATUS_STYLES[(status || "pending").toLowerCase()] || STATUS_STYLES.pending;
}

function formatStatusLabel(status) {
  const value = status || "Pending";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function parseLikesCount(post) {
  const count = Number(post?.likes_count);
  return Number.isFinite(count) ? count : 0;
}

function parseCommentsCount(post) {
  const count = Number(post?.comments_count);
  return Number.isFinite(count) ? count : 0;
}

function getEntityId(value) {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value._id || value.id || value.$id || null;
}

function getDisplayName(user) {
  const explicit = String(
    user?.name || user?.fullName || user?.username || ""
  ).trim();
  if (explicit) return explicit;

  const first = String(user?.firstName || "").trim();
  const last = String(user?.lastName || "").trim();
  const full = [first, last].filter(Boolean).join(" ");

  return full || user?.email || "Unknown";
}

export default function PostCard({ post, inGroupedSection = false }) {
  const { user } = useUser();
  const categoryMeta = getCategoryMeta(post.type);
  const statusMeta = getStatusMeta(post.status);
  const isVeterinaryAuthor = isVeterinaryUser(post?.user);
  const petType = post.pet_type || post.petType || "Unknown";
  const postId = post?._id || post?.id;
  const authorId = useMemo(() => getEntityId(post?.user), [post?.user]);
  const userId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(() => parseLikesCount(post));
  const [commentsCount, setCommentsCount] = useState(() =>
    parseCommentsCount(post)
  );
  const [likeSubmitting, setLikeSubmitting] = useState(false);

  const formatLocation = () => {
    if (!post.location) return "";

    const parts = [
      post.location.governorate || post.location.city,
      post.location.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const authorName = getDisplayName(post?.user);
  const authorMeta = formatUserTypeRatingWithCount(post?.user);

  const handleOpenPost = () => {
    if (!postId) return;
    router.push(`/post/${postId}`);
  };

  const handleOpenAuthorProfile = () => {
    if (!authorId) return;
    router.push(`/user/${authorId}`);
  };

  useEffect(() => {
    setLikesCount(parseLikesCount(post));
  }, [post?.likes_count, postId]);

  useEffect(() => {
    setCommentsCount(parseCommentsCount(post));
  }, [post?.comments_count, postId]);

  useEffect(() => {
    let mounted = true;

    if (!userId || !postId) {
      setLiked(false);
      return () => {
        mounted = false;
      };
    }

    isPostLiked(postId, userId)
      .then((value) => {
        if (mounted) setLiked(Boolean(value));
      })
      .catch(() => {
        if (mounted) setLiked(false);
      });

    return () => {
      mounted = false;
    };
  }, [postId, userId]);

  const handleLikePress = async () => {
    if (!postId || likeSubmitting) return;

    if (!userId) {
      router.push("/(auth)/login");
      return;
    }

    const previousLiked = liked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;

    setLikeSubmitting(true);
    setLiked(nextLiked);
    setLikesCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));

    try {
      if (nextLiked) {
        await likePost(postId);
      } else {
        await unlikePost(postId);
      }
    } catch (error) {
      const message = String(error?.message || "").toLowerCase();

      if (message.includes("already liked")) {
        setLiked(true);
      } else if (message.includes("like not found")) {
        setLiked(false);
      } else {
        setLiked(previousLiked);
        setLikesCount(previousCount);
      }
    } finally {
      try {
        const updatedCount = await getLikesCount(postId);
        setLikesCount(updatedCount);
      } catch (error) {
        console.log("Refresh likes count error:", error?.message || error);
      }

      setLikeSubmitting(false);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={handleOpenPost}>
      <View
        style={[
          styles.card,
          isVeterinaryAuthor && styles.cardVeterinary,
          inGroupedSection && styles.cardGrouped,
        ]}
      >
        <View style={styles.imageWrapper}>
          {!!post.image ? (
            <Image source={{ uri: post.image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="paw" size={42} color="#C5D9CC" />
            </View>
          )}

          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor: categoryMeta.backgroundColor,
                borderColor: categoryMeta.borderColor,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.categoryBadgeText,
                { color: categoryMeta.textColor },
              ]}
            >
              {categoryMeta.label}
            </ThemedText>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleWrap}>
              <Ionicons
                name={categoryMeta.icon}
                size={18}
                color={categoryMeta.iconColor}
                style={styles.titleIcon}
              />
              <ThemedText title style={styles.title} numberOfLines={1}>
                {post.title || "Untitled"}
              </ThemedText>
            </View>

            {isVeterinaryAuthor ? (
              <View style={styles.veterinaryBadge}>
                <Ionicons name="medkit-outline" size={12} color="#197B57" />
                <ThemedText style={styles.veterinaryBadgeText}>Vet</ThemedText>
              </View>
            ) : null}

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusMeta.backgroundColor },
              ]}
            >
              <ThemedText
                style={[styles.statusText, { color: statusMeta.textColor }]}
              >
                {formatStatusLabel(post.status)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="paw" size={20} color="#43B562" />
            <ThemedText style={styles.detailLabel}>Pet type:</ThemedText>
            <ThemedText title style={styles.detailValue}>
              {petType}
            </ThemedText>
          </View>

          {!!post.description && (
            <ThemedText
              style={styles.description}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {post.description}
            </ThemedText>
          )}

          {!!formatLocation() && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={18} color="#E54D4D" />
              <ThemedText style={styles.locationText}>{formatLocation()}</ThemedText>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.authorRow}
              activeOpacity={0.75}
              disabled={!authorId}
              onPress={(event) => {
                event?.stopPropagation?.();
                handleOpenAuthorProfile();
              }}
            >
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={authorId ? "#4B6A58" : "#8C8C8C"}
              />
              <View style={styles.authorTextWrap}>
                <ThemedText
                  style={[styles.footerText, authorId && styles.footerTextInteractive]}
                  numberOfLines={1}
                >
                  by {authorName}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.authorMetaText,
                    isVeterinaryAuthor && styles.authorMetaTextVeterinary,
                  ]}
                  numberOfLines={1}
                >
                  {authorMeta}
                </ThemedText>
              </View>
            </TouchableOpacity>

            <View style={styles.countersRow}>
              <View style={styles.commentsPill}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color="#7A8580"
                />
                <ThemedText style={styles.commentsText}>
                  {commentsCount}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.likesPill, likeSubmitting && styles.likesPillDisabled]}
                activeOpacity={0.86}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  handleLikePress();
                }}
                disabled={likeSubmitting}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={20}
                  color="#E14747"
                />
                <ThemedText style={styles.likesText}>
                  {likesCount}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.45,
    borderColor: "#D4E0D9",
    overflow: "hidden",
    shadowColor: "#214032",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardVeterinary: {
    borderColor: "#C6E9D1",
    borderWidth: 1.65,
    backgroundColor: "#FCFFFD",
  },
  cardGrouped: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 20,
  },
  imageWrapper: {
    position: "relative",
    padding: 10,
    paddingBottom: 0,
    backgroundColor: "#FCFEFD",
  },
  image: {
    width: "100%",
    height: 232,
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: "100%",
    height: 232,
    borderRadius: 16,
    backgroundColor: "#F2F7F4",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 10,
  },
  veterinaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E9FAF1",
    borderColor: "#BFE9CF",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginRight: 2,
  },
  veterinaryBadgeText: {
    fontSize: 10.5,
    color: "#197B57",
    fontWeight: "800",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  statusBadge: {
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  detailLabel: {
    marginLeft: 8,
    marginRight: 6,
    color: "#78827D",
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
  },
  description: {
    color: "#4D5551",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 1,
    marginBottom: 7,
  },
  locationText: {
    marginLeft: 8,
    color: "#5A615D",
    fontSize: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E7EDE9",
    marginTop: 8,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  countersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  footerText: {
    marginLeft: 8,
    color: "#8A8F8C",
    fontSize: 13,
  },
  footerTextInteractive: {
    color: "#486A58",
    fontWeight: "700",
  },
  authorMetaText: {
    marginLeft: 8,
    marginTop: 2,
    color: "#7D8A84",
    fontSize: 11.5,
    fontWeight: "600",
  },
  authorMetaTextVeterinary: {
    color: "#197B57",
  },
  commentsPill: {
    minWidth: 64,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.25,
    borderColor: "#D5DDDA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: "#FAFCFB",
  },
  commentsText: {
    marginLeft: 5,
    color: "#6D7671",
    fontSize: 13,
    fontWeight: "700",
  },
  likesPill: {
    minWidth: 74,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E14747",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  likesPillDisabled: {
    opacity: 0.68,
  },
  likesText: {
    marginLeft: 6,
    color: "#E14747",
    fontSize: 14,
    fontWeight: "700",
  },
});

