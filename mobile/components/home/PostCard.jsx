import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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

export default function PostCard({ post }) {
  const categoryMeta = getCategoryMeta(post.type);
  const statusMeta = getStatusMeta(post.status);
  const petType = post.pet_type || post.petType || "Unknown";

  const formatLocation = () => {
    if (!post.location) return "";

    const parts = [post.location.city, post.location.country].filter(Boolean);
    return parts.join(", ");
  };

  const authorName =
    post.user?.username ||
    post.user?.name ||
    post.user?.fullName ||
    post.user?.email ||
    "Unknown";

  const handleOpenPost = () => {
    router.push(`/post/${post._id || post.id}`);
  };

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={handleOpenPost}>
      <View style={styles.card}>
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
                size={20}
                color={categoryMeta.iconColor}
                style={styles.titleIcon}
              />
              <ThemedText title style={styles.title}>
                {post.title || "Untitled"}
              </ThemedText>
            </View>

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
            <ThemedText style={styles.description} numberOfLines={3}>
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
            <View style={styles.authorRow}>
              <Ionicons name="person-circle-outline" size={24} color="#8C8C8C" />
              <ThemedText style={styles.footerText}>
                Posted by: {authorName}
              </ThemedText>
            </View>

            <View style={styles.likesPill}>
              <Ionicons name="heart-outline" size={20} color="#E14747" />
              <ThemedText style={styles.likesText}>
                {post.likes_count ?? 0}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EAF0EC",
    overflow: "hidden",
    shadowColor: "#214032",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  imageWrapper: {
    position: "relative",
    padding: 16,
    paddingBottom: 0,
  },
  image: {
    width: "100%",
    height: 290,
    borderRadius: 20,
  },
  imagePlaceholder: {
    width: "100%",
    height: 290,
    borderRadius: 20,
    backgroundColor: "#F2F7F4",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 28,
    left: 28,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
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
    fontSize: 18,
    fontWeight: "800",
  },
  statusBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
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
    fontSize: 15,
    lineHeight: 24,
    marginTop: 2,
    marginBottom: 10,
  },
  locationText: {
    marginLeft: 8,
    color: "#5A615D",
    fontSize: 15,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#EEF2EF",
    marginTop: 12,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  footerText: {
    marginLeft: 8,
    color: "#8A8F8C",
    fontSize: 14,
  },
  likesPill: {
    minWidth: 86,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#E14747",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  likesText: {
    marginLeft: 8,
    color: "#E14747",
    fontSize: 16,
    fontWeight: "700",
  },
});
