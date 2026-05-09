import {
  ActivityIndicator,
  FlatList,
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
import PostCard from "./PostCard";

const GREEN = "#3DB85C";
/** Align with MeetGrid masonry (`paddingTop: 12`) + MeetCard spacing (`marginBottom: 12`) */
const CARD_SECTION_PADDING_TOP = 12;

export default function PostsFeed({ selectedFilter = "All" }) {
  const insets = useSafeAreaInsets();
  const fabBottom = Math.max(insets.bottom - 18, -10);
  const { filters } = useLocationFilter();
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
    }, [filters.governorate, filters.country])
  );

  const filteredPosts =
    selectedFilter === "All"
      ? posts
      : posts.filter(
          (post) =>
            (post.type || "").toLowerCase() === selectedFilter.toLowerCase()
        );
  const isInitialLoading = loading && filteredPosts.length === 0;

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
        ListFooterComponent={
          isInitialLoading ? (
            <View style={styles.loadingCard}>
              <View style={styles.center}>
                <ActivityIndicator size="large" color={GREEN} />
              </View>
            </View>
          ) : !loading && filteredPosts.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="paw-off" size={42} color="#B9D8C1" />
                <ThemedText style={styles.emptyTitle}>No posts yet</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Try another category or change the area filter above.
                </ThemedText>
              </View>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => router.push("/post/new-post")}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  listContent: {
    paddingTop: CARD_SECTION_PADDING_TOP,
    paddingBottom: 112,
  },
  loadingCard: {
    marginHorizontal: 14,
    marginTop: 0,
    marginBottom: 8,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.35,
    borderColor: "#D6E2DB",
  },
  emptyCard: {
    marginHorizontal: 14,
    marginTop: 0,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.35,
    borderColor: "#D6E2DB",
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
    paddingTop: 36,
    paddingBottom: 36,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 7,
  },
});

