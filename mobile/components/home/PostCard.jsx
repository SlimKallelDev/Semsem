import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useUser } from "../../contexts/UserContext";
import { usePreferences, getLocaleForLanguage } from "../../contexts/PreferencesContext";
import { convertCurrencyAmount, formatCurrencyAmount } from "../../services/currencyService";
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
  sale: {
    label: "SALE",
    backgroundColor: "#FFF7E8",
    borderColor: "#FFE1AD",
    textColor: "#A86513",
    icon: "pricetag",
    iconColor: "#D88C23",
  },
  general: {
    label: "QUESTION",
    backgroundColor: "#F3FBF5",
    borderColor: "#DDEEE1",
    textColor: "#3C9C5A",
    icon: "help-circle",
    iconColor: "#3C9C5A",
  },
};

const STATUS_STYLES = {
  published: {
    backgroundColor: "#EAF7EE",
    textColor: "#2A9448",
  },
  blocked: {
    backgroundColor: "#FCEAEA",
    textColor: "#B43D3D",
  },
};

function normalizePostStatus(status) {
  const value = String(status || "published").toLowerCase();
  return ["blocked", "rejected", "archived"].includes(value)
    ? "blocked"
    : "published";
}

function getCategoryMeta(type) {
  const normalized = String(type || "general")
    .trim()
    .toLowerCase();
  const category =
    ["vente", "sell", "selling", "for_sale", "for-sale"].includes(normalized)
      ? "sale"
      : normalized;

  return CATEGORY_STYLES[category] || CATEGORY_STYLES.general;
}

function getStatusMeta(status) {
  return STATUS_STYLES[normalizePostStatus(status)];
}

function formatStatusLabel(status) {
  const value = normalizePostStatus(status);
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function parseLikesCount(post) {
  const count = Number(post?.likesCount);
  return Number.isFinite(count) ? count : 0;
}

function parseCommentsCount(post) {
  const count = Number(post?.commentsCount);
  return Number.isFinite(count) ? count : 0;
}

function formatSaleBadgeLabel(post, categoryMeta, formattedSalePrice, translate) {
  if (categoryMeta !== CATEGORY_STYLES.sale) return translate(categoryMeta.label);
  return formattedSalePrice
    ? `${translate(categoryMeta.label)} - ${formattedSalePrice}`
    : translate(categoryMeta.label);
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

function getPostImageUri(post) {
  const image = post?.image || (Array.isArray(post?.images) ? post.images[0] : null);

  if (typeof image === "string") return image;
  return image?.url || image?.uri || "";
}

export default function PostCard({ post, inGroupedSection = false }) {
  const { user } = useUser();
  const { currency: preferredCurrency, language, t } = usePreferences();
  const categoryMeta = getCategoryMeta(post.type);
  const [formattedSalePrice, setFormattedSalePrice] = useState("");
  const categoryBadgeLabel = formatSaleBadgeLabel(post, categoryMeta, formattedSalePrice, t);
  const statusMeta = getStatusMeta(post.status);
  const isVeterinaryAuthor = isVeterinaryUser(post?.user);
  const petType = post.petType || "Unknown";
  const postId = post?._id || post?.id;
  const linkedPets = Array.isArray(post?.linkedPets)
    ? post.linkedPets.filter((pet) => getEntityId(pet))
    : [];
  const postImageUri = getPostImageUri(post);
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

  useEffect(() => {
    let active = true;
    const rawPrice = post?.price ?? post?.salePrice ?? post?.priceAmount;
    const amount = Number(String(rawPrice ?? "").trim().replace(",", "."));
    const sourceCurrency = String(post?.currency || post?.priceCurrency || "")
      .trim()
      .toUpperCase();

    if (categoryMeta !== CATEGORY_STYLES.sale || !Number.isFinite(amount) || amount <= 0 || !sourceCurrency) {
      setFormattedSalePrice("");
      return () => { active = false; };
    }

    if (sourceCurrency === preferredCurrency) {
      setFormattedSalePrice(formatCurrencyAmount(amount, preferredCurrency, getLocaleForLanguage(language)));
    } else {
      setFormattedSalePrice("");
      convertCurrencyAmount(amount, sourceCurrency, preferredCurrency).then((converted) => {
        if (!active) return;
        const displayCurrency = converted === null ? sourceCurrency : preferredCurrency;
        const displayAmount = converted === null ? amount : converted;
        const formatted = formatCurrencyAmount(displayAmount, displayCurrency, getLocaleForLanguage(language));
        setFormattedSalePrice(converted === null ? formatted : `≈ ${formatted}`);
      });
    }

    return () => { active = false; };
  }, [categoryMeta, language, post?.currency, post?.price, post?.priceAmount, post?.priceCurrency, post?.salePrice, preferredCurrency]);

  const formatLocation = () => {
    if (!post.location) return "";

    const parts = [
      post.location.country,
      post.location.governorate || post.location.city,
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
  }, [post?.likesCount, postId]);

  useEffect(() => {
    setCommentsCount(parseCommentsCount(post));
  }, [post?.commentsCount, postId]);

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
          <View style={styles.imageViewport}>
            {!!postImageUri ? (
              <Image
                source={{ uri: postImageUri }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="paw" size={42} color="#C5D9CC" />
              </View>
            )}
          </View>

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
              numberOfLines={1}
            >
              {categoryBadgeLabel}
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

          {linkedPets.length ? (
            <View style={styles.linkedPetsRow}>
              {linkedPets.map((pet) => {
                const petId = getEntityId(pet);
                return (
                  <TouchableOpacity
                    key={String(petId)}
                    style={styles.linkedPetChip}
                    activeOpacity={0.8}
                    accessibilityRole="link"
                    accessibilityLabel={`${t("View profile")}: ${pet?.name || t("View pet")}`}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      router.push(`/pet/${petId}`);
                    }}
                  >
                    <MaterialCommunityIcons name="paw" size={14} color="#2E8F4B" />
                    <ThemedText style={styles.linkedPetText} numberOfLines={1}>
                      {pet?.name || "View pet"}
                    </ThemedText>
                    <View style={styles.linkedPetAction}>
                      <ThemedText style={styles.linkedPetActionText}>
                        {t("View profile")}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={12} color="#2E8F4B" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

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
  imageViewport: {
    width: "100%",
    height: 232,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2F7F4",
  },
  image: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.05 }],
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F2F7F4",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    maxWidth: "88%",
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
  linkedPetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 2,
  },
  linkedPetChip: {
    maxWidth: "100%",
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: "#EFF8F1",
    borderWidth: 1,
    borderColor: "#D4E9D9",
  },
  linkedPetText: {
    maxWidth: 120,
    color: "#34734A",
    fontSize: 11,
    fontWeight: "700",
  },
  linkedPetAction: { flexDirection: "row", alignItems: "center", gap: 2 },
  linkedPetActionText: { color: "#2E8F4B", fontSize: 10, fontWeight: "900" },
  detailLabel: {
    marginLeft: 8,
    marginRight: 6,
    color: "#78827D",
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
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

