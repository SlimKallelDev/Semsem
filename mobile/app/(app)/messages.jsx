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
import ThemedView from "../../components/ThemedView";
import Spacer from "../../components/Spacer";
import { useUser } from "../../contexts/UserContext";
import { getUserConversations } from "../../services/messageService";

export default function MessagesScreen() {
  const { user } = useUser();

  const userId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await getUserConversations(userId);
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
  };

  const renderConversation = ({ item }) => {
    const otherUser = item?.participants?.find(
      (participant) => String(participant?._id) !== String(userId)
    );

    const avatarUri =
      otherUser?.image ||
      "https://via.placeholder.com/100x100.png?text=User";

    const title = otherUser?.name || "Conversation";
    const subtitle = item?.lastMessage?.text || "Start conversation";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push(`/messages/${item._id}`)}
      >
        <Image source={{ uri: avatarUri }} style={styles.avatar} />

        <View style={styles.textContainer}>
          <ThemedText style={styles.name}>{title}</ThemedText>
          <ThemedText style={styles.lastMessage} numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
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
          <ThemedText>You need to be logged in to see messages.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Messages 💬
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          All your conversations with other users
        </ThemedText>

        <Spacer height={16} />

        <FlatList
          data={conversations}
          keyExtractor={(item, index) => item?._id || `${index}`}
          renderItem={renderConversation}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            conversations.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>
                No conversations yet
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                Open a pet profile and tap “Message owner” to start chatting.
              </ThemedText>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.7,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#e9e9e9",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  lastMessage: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.75,
  },
});