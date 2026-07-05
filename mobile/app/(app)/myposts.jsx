import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import ThemedText from "../../components/ThemedText";
import { getPostTypeLabel } from "../../constants/postTypes";
import { useUser } from "../../contexts/UserContext";
import { getMyPosts } from "../../services/postService";

const GREEN = "#3DB85C";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const STATUS_STYLES = {
  published: { bg: "#E8F8EE", text: GREEN },
  blocked: { bg: "#FEECEC", text: "#D63031" },
};

function normalizePostStatus(status) {
  const value = String(status || "published").toLowerCase();
  return ["blocked", "rejected", "archived"].includes(value)
    ? "blocked"
    : "published";
}

function statusStyle(status) {
  return STATUS_STYLES[normalizePostStatus(status)];
}

const TYPE_COLORS = {
  adoption: GREEN,
  found: "#3DB85C",
  lost: "#E05B5B",
  mating: "#9B59B6",
  general: "#5B8FE0",
};

function typeColor(type) {
  return TYPE_COLORS[(type || "").toLowerCase()] || GREEN;
}

function PostRow({ item }) {
  const postId = item?._id || item?.id;
  const imageUri =
    item?.image ||
    item?.images?.[0] ||
    "https://via.placeholder.com/200x200.png?text=Post";

  const sStyle = statusStyle(item?.status);
  const displayStatus = normalizePostStatus(item?.status);
  const isBlocked = displayStatus === "blocked";
  const tColor = typeColor(item?.type);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.card, isBlocked && styles.cardBlocked]}
      disabled={isBlocked}
      onPress={() => !isBlocked && postId && router.push(`/post/${postId}`)}
    >
      <Image source={{ uri: imageUri }} style={styles.cardImage} />

      <View style={styles.cardInfo}>
        {/* Title */}
        <ThemedText style={styles.postTitle} numberOfLines={2}>
          {item?.title || "Untitled Post"}
        </ThemedText>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {!!item?.type && (
            <View
              style={[
                styles.tag,
                { borderColor: tColor, backgroundColor: "#F5FDF7" },
              ]}
            >
              <ThemedText style={[styles.tagText, { color: tColor }]}>
                {getPostTypeLabel(item.type)}
              </ThemedText>
            </View>
          )}
          {!!displayStatus && (
            <View
              style={[
                styles.statusTag,
                { backgroundColor: sStyle.bg },
              ]}
            >
              <ThemedText style={[styles.statusTagText, { color: sStyle.text }]}>
                {capitalize(displayStatus)}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Bottom row: likes + date */}
        <View style={styles.bottomRow}>
          <View style={styles.likesBlock}>
            <Ionicons name="heart" size={13} color="#E05555" />
            <ThemedText style={styles.likesText}>
              {item?.likes_count || 0} likes
            </ThemedText>
          </View>
          <ThemedText style={styles.dateText}>
            {formatDate(item?.createdAt)}
          </ThemedText>
        </View>
      </View>

      {/* 3-dot menu */}
      <TouchableOpacity
        style={styles.menuBtn}
        activeOpacity={0.7}
        disabled={isBlocked}
        onPress={() => !isBlocked && postId && router.push(`/post/${postId}`)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#B0BAB5" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function StatsRow({ posts }) {
  const total = posts.length;
  const active = posts.filter(
    (p) => normalizePostStatus(p?.status) === "published"
  ).length;
  const likes = posts.reduce((sum, p) => sum + (p?.likes_count || 0), 0);

  const stats = [
    { value: total, label: "Total" },
    { value: active, label: "Published" },
    { value: likes, label: "Likes" },
  ];

  return (
    <View style={styles.statsRow}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.statBox, i < stats.length - 1 && styles.statBoxBorder]}>
          <ThemedText style={styles.statValue}>{s.value}</ThemedText>
          <ThemedText style={styles.statLabel}>{s.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export default function MyPosts({ embedded = false, onCountChange } = {}) {
  const { user, initializing } = useUser();

  const userId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyPosts = useCallback(async () => {
    if (!userId) {
      setPosts([]);
      onCountChange?.(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await getMyPosts();
      const nextPosts = Array.isArray(data) ? data : [];
      setPosts(nextPosts);
      onCountChange?.(nextPosts.length);
    } catch (error) {
      console.log("Get my posts error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onCountChange, userId]);

  useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  useEffect(() => {
    if (!embedded && !initializing && !userId) {
      router.replace("/(auth)/login");
    }
  }, [embedded, initializing, userId]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safe, embedded && styles.embeddedSafe]}
        edges={[]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  if (!userId) return null;

  return (
    <SafeAreaView
      style={[styles.safe, embedded && styles.embeddedSafe]}
      edges={[]}
    >
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id || item.id}
        renderItem={({ item }) => <PostRow item={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMyPosts();
            }}
            tintColor={GREEN}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          embedded && styles.embeddedListContent,
        ]}
        ListHeaderComponent={!embedded ? (
          <>
            <View style={styles.pageHeader}>
              <ThemedText style={styles.pageTitle}>My Posts</ThemedText>
              <TouchableOpacity
                style={styles.addBtn}
                activeOpacity={0.85}
                onPress={() => router.push("/post/new-post")}
              >
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {posts.length > 0 && <StatsRow posts={posts} />}
          </>
        ) : null}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={GREEN} />
            <ThemedText style={styles.emptyTitle}>No posts yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Tap the + button to create your first post.
            </ThemedText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  embeddedSafe: {
    backgroundColor: "transparent",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  embeddedListContent: {
    paddingTop: 12,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 14,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#131F17",
    letterSpacing: -0.4,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 18,
    shadowColor: "#1A3028",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statBoxBorder: {
    borderRightWidth: 1,
    borderRightColor: "#EEF2EF",
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: GREEN,
  },
  statLabel: {
    fontSize: 13,
    color: "#8E9B93",
    marginTop: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#1A3028",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBlocked: {
    opacity: 0.72,
    borderColor: "#E7BABA",
  },
  cardImage: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: "#E6EDE8",
  },
  cardInfo: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 4,
    gap: 5,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#131F17",
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  likesBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likesText: {
    fontSize: 13,
    color: "#8E9B93",
  },
  dateText: {
    fontSize: 12,
    color: "#A8B4AD",
  },
  menuBtn: {
    padding: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C3A31",
  },
  emptyText: {
    fontSize: 14,
    color: "#8E9B93",
    textAlign: "center",
    lineHeight: 20,
  },
});
