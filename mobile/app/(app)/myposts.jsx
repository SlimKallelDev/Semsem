import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import PostCard from "../../components/home/PostCard";
import { useUser } from "../../contexts/UserContext";
import { getPostsByUser } from "../../services/postService";

export default function MyPosts() {
  const { user } = useUser();

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
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await getPostsByUser(userId);
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Get my posts error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyPosts();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ThemedView style={styles.center}>
          <ThemedText>You need to be logged in to see your posts.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">My Posts</ThemedText>

          <TouchableOpacity
            style={styles.newPostButton}
            onPress={() => router.push("/post/new-post")}
          >
            <ThemedText style={styles.newPostButtonText}>+ New Post</ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push(`/post/${item._id}`)}
            >
              <PostCard post={item} />
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[
            styles.listContent,
            posts.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText>You have not created any posts yet.</ThemedText>
            </View>
          }
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  newPostButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newPostButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});