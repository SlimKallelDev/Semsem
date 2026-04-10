import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import {
  createComment,
  getCommentsByPost,
} from "../../services/commentService";
import {
  getLikesByPost,
  likePost,
  unlikePost,
} from "../../services/likeService";
import { deletePost, getPostById } from "../../services/postService";
import { useUser } from "../../contexts/UserContext";
import { emitNotificationsUpdated } from "../../services/notificationEvents";
import { markNotificationsByResourceAsRead } from "../../services/notificationService";

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useUser();

  const currentUserId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadAll();
    }
  }, [id]);

  useEffect(() => {
    if (!id || !currentUserId) return;

    markNotificationsByResourceAsRead({
      resourceType: "post",
      resourceId: id,
    })
      .then(() => {
        emitNotificationsUpdated();
      })
      .catch((error) => {
        console.log("Mark post notifications error:", error.message);
      });
  }, [currentUserId, id]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [postData, commentsData, likesData] = await Promise.all([
        getPostById(id),
        getCommentsByPost(id),
        getLikesByPost(id),
      ]);

      setPost(postData);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setLikes(Array.isArray(likesData) ? likesData : []);
    } catch (error) {
      console.log("Load post details error:", error.message);
      Alert.alert("Error", error.message || "Failed to load post");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await getCommentsByPost(id);
      setComments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Load comments error:", error.message);
    }
  };

  const loadLikes = async () => {
    try {
      const data = await getLikesByPost(id);
      setLikes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Load likes error:", error.message);
    }
  };

  const postOwnerId = post?.user?._id || post?.user;
  const isOwner = String(postOwnerId) === String(currentUserId);

  const alreadyLiked = likes.some((like) => {
    const likeUserId = like?.user?._id || like?.user;
    return String(likeUserId) === String(currentUserId);
  });

  const handleToggleLike = async () => {
    if (!currentUserId || likeSubmitting) {
      if (!currentUserId) {
        Alert.alert("Error", "You need to be logged in");
      }
      return;
    }

    try {
      setLikeSubmitting(true);

      if (alreadyLiked) {
        await unlikePost(id);
      } else {
        await likePost(id);
      }

      await loadLikes();
    } catch (error) {
      console.log("Toggle like error:", error.message);
      Alert.alert("Error", error.message || "Failed to update like");
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentUserId) {
      Alert.alert("Error", "You need to be logged in");
      return;
    }

    if (!commentText.trim()) {
      return;
    }

    try {
      setCommentSubmitting(true);

      await createComment({
        post: id,
        user: currentUserId,
        text: commentText.trim(),
      });

      setCommentText("");
      await loadComments();
    } catch (error) {
      console.log("Create comment error:", error.message);
      Alert.alert("Error", error.message || "Failed to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeletePost = () => {
    Alert.alert("Delete post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await deletePost(id);
            Alert.alert("Success", "Post deleted successfully");
            router.replace("/myposts");
          } catch (error) {
            console.log("Delete post error:", error.message);
            Alert.alert("Error", error.message || "Failed to delete post");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const locationText = [post?.location?.city, post?.location?.country]
    .filter(Boolean)
    .join(", ");

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppTopBar title="Post Details" />
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppTopBar title="Post Details" />
        <ThemedView style={styles.center}>
          <ThemedText>Post not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <AppTopBar title="Post Details" />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {!!post.image && (
            <Image source={{ uri: post.image }} style={styles.image} />
          )}

          <ThemedText type="title" style={styles.title}>
            {post.title}
          </ThemedText>

          <ThemedText style={styles.meta}>
            {(post.type || "Post").toString()} | {(post.pet_type || "Pet").toString()}
          </ThemedText>

          {!!locationText && (
            <ThemedText style={styles.location}>Location: {locationText}</ThemedText>
          )}

          <ThemedText style={styles.author}>
            Posted by: {post.user?.name || post.user?.email || "Unknown user"}
          </ThemedText>

          {!!post.description && (
            <ThemedText style={styles.description}>
              {post.description}
            </ThemedText>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.likeButton,
                alreadyLiked && styles.likeButtonActive,
                likeSubmitting && styles.disabledButton,
              ]}
              onPress={handleToggleLike}
              disabled={likeSubmitting}
            >
              <ThemedText
                style={[
                  styles.likeButtonText,
                  alreadyLiked && styles.likeButtonTextActive,
                ]}
              >
                {alreadyLiked ? "Liked" : "Like"} ({likes.length})
              </ThemedText>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/post/edit/${id}`)}
              >
                <ThemedText style={styles.editButtonText}>Edit</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {isOwner && (
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.disabledButton]}
              onPress={handleDeletePost}
              disabled={deleting}
            >
              <ThemedText style={styles.deleteButtonText}>
                {deleting ? "Deleting..." : "Delete Post"}
              </ThemedText>
            </TouchableOpacity>
          )}

          <ThemedText style={styles.sectionTitle}>
            Comments ({comments.length})
          </ThemedText>

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.commentSendButton,
                commentSubmitting && styles.disabledButton,
              ]}
              onPress={handleAddComment}
              disabled={commentSubmitting}
            >
              <ThemedText style={styles.commentSendText}>
                {commentSubmitting ? "..." : "Send"}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {comments.length === 0 ? (
            <ThemedText style={styles.emptyText}>No comments yet.</ThemedText>
          ) : (
            comments.map((comment) => (
              <View key={comment._id} style={styles.commentCard}>
                <ThemedText style={styles.commentAuthor}>
                  {comment.user?.name || comment.user?.email || "User"}
                </ThemedText>
                <ThemedText style={styles.commentText}>
                  {comment.text}
                </ThemedText>
              </View>
            ))
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  image: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#e9e9e9",
  },
  title: {
    marginBottom: 8,
  },
  meta: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 6,
    textTransform: "capitalize",
  },
  location: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 6,
  },
  author: {
    fontSize: 14,
    opacity: 0.75,
    marginBottom: 14,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  likeButton: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  likeButtonActive: {
    backgroundColor: "#fde7ea",
  },
  likeButtonText: {
    fontWeight: "700",
  },
  likeButtonTextActive: {
    color: "#c0392b",
  },
  editButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  commentSendButton: {
    backgroundColor: "#222",
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSendText: {
    color: "#fff",
    fontWeight: "700",
  },
  emptyText: {
    opacity: 0.7,
    marginTop: 4,
  },
  commentCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  commentAuthor: {
    fontWeight: "700",
    marginBottom: 4,
  },
  commentText: {
    lineHeight: 20,
  },
});
