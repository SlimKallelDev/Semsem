import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocationFilter } from "../../contexts/LocationFilterContext";
import { getPosts } from "../../services/postService";
import ThemedText from "../ThemedText";
import HomeMeetPreview from "./HomeMeetPreview";
import PostCard from "./PostCard";

const GREEN = "#3DB85C";
const GREEN_DARK = "#2A9448";
const FILTERS = ["All", "Adoption", "Lost", "Found", "Mating", "General"];

export default function PostsFeed() {
  const insets = useSafeAreaInsets();
  const fabBottom = Math.max(insets.bottom - 18, -10);
  const { filters, selectionLabel } = useLocationFilter();
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getPosts(filters);
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Get posts error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [filters.city, filters.country])
  );

  const filteredPosts =
    selectedFilter === "All"
      ? posts
      : posts.filter(
          (post) =>
            (post.type || "").toLowerCase() === selectedFilter.toLowerCase()
        );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <FlatList
        data={filteredPosts}
        keyExtractor={(item, index) =>
          (item?._id || item?.id || index).toString()
        }
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => loadPosts(true)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <HomeMeetPreview />

            <View style={styles.postsSectionIntro}>
              <View style={styles.postsTitleRow}>
                <View style={styles.postsTitleIcon}>
                  <Ionicons name="document-text-outline" size={18} color={GREEN} />
                </View>
                <View>
                  <ThemedText style={styles.postsTitle}>Latest Posts</ThemedText>
                  <ThemedText style={styles.postsSubtitle}>
                    {selectionLabel === "Near Me"
                      ? "Fresh community updates around your area"
                      : selectionLabel === "In All the World"
                        ? "Fresh community updates from every region"
                        : `Fresh community updates in ${selectionLabel}`}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.categoriesSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
              >
                {FILTERS.map((filter) => {
                  const isActive = selectedFilter === filter;

                  return (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.categoryChip,
                        isActive && styles.categoryChipActive,
                      ]}
                      onPress={() => setSelectedFilter(filter)}
                      activeOpacity={0.85}
                    >
                      <ThemedText
                        style={[
                          styles.categoryChipText,
                          isActive && styles.categoryChipTextActive,
                        ]}
                      >
                        {filter}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={GREEN} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="paw-off" size={42} color="#B9D8C1" />
              <ThemedText style={styles.emptyTitle}>No posts yet</ThemedText>
              <ThemedText style={styles.emptyText}>
                Try another category or change the area filter above.
              </ThemedText>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => router.push("/post/new-post")}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={34} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6FAF8",
  },
  listContent: {
    paddingBottom: 112,
  },
  postsSectionIntro: {
    backgroundColor: "#F1F7F3",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  postsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  postsTitleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF8ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  postsTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#17211B",
  },
  postsSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#758179",
  },
  categoriesSection: {
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
    marginBottom: 12,
  },
  categoriesRow: {
    paddingHorizontal: 18,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F7F7F7",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    justifyContent: "center",
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: "#FFFFFF",
    borderColor: GREEN,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666A67",
  },
  categoryChipTextActive: {
    color: GREEN_DARK,
    fontWeight: "700",
  },
  center: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 56,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E4637",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    textAlign: "center",
    color: "#7A8680",
    lineHeight: 21,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 9,
  },
});
