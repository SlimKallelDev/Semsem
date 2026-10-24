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
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import {
  palette,
  radii,
  shadows,
} from "../../constants/designSystem";
import { formatUserTypeRatingWithCount } from "../../constants/userDisplay";
import { useUser } from "../../contexts/UserContext";
import { getUserConversations } from "../../services/messageService";

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.userId || value?.$id || null;
};

const getDisplayName = (person) => {
  const explicit = String(
    person?.name || person?.fullName || person?.username || ""
  ).trim();

  if (explicit) return explicit;

  const first = String(person?.firstName || "").trim();
  const last = String(person?.lastName || "").trim();
  const fullName = [first, last].filter(Boolean).join(" ");

  return fullName || String(person?.email || "Conversation").trim();
};

export default function MessagesScreen() {
  const { user, initializing } = useUser();

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

  useEffect(() => {
    if (!initializing && !userId) {
      router.replace("/(auth)/login");
    }
  }, [initializing, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
  };

  const renderConversation = ({ item }) => {
    const otherUser = item?.participants?.find(
      (participant) => String(getEntityId(participant)) !== String(userId)
    );

    const avatarUri =
      otherUser?.avatar ||
      otherUser?.image ||
      "https://via.placeholder.com/100x100.png?text=User";

    const title = getDisplayName(otherUser);
    const profileMeta = formatUserTypeRatingWithCount(otherUser);
    const subtitle = item?.lastMessage?.text || "Start conversation";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push(`/messages/${item._id}`)}
      >
        <Image source={{ uri: avatarUri }} style={styles.avatar} />

        <View style={styles.textContainer}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText style={styles.profileMeta} numberOfLines={1}>
            {profileMeta}
          </ThemedText>
          <ThemedText style={styles.lastMessage} numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!userId) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ThemedView style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="chatbubbles-outline"
              size={27}
              color={palette.primary}
            />
          </View>
          <View style={styles.headerText}>
            <ThemedText style={styles.title}>Messages</ThemedText>
            <ThemedText style={styles.subtitle}>
              Your conversations with the Semsem community
            </ThemedText>
          </View>
        </View>

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
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={32}
                  color={palette.primary}
                />
              </View>
              <ThemedText style={styles.emptyTitle}>No conversations yet</ThemedText>
              <ThemedText style={styles.emptyText}>
                Open a pet profile and tap "Message" to start chatting.
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
    backgroundColor: palette.background,
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
  headerCard: {
    minHeight: 92,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    ...shadows.soft,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: palette.ink,
  },
  subtitle: {
    marginTop: 3,
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 4,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 72,
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 26,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: palette.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: palette.muted,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 13,
    marginBottom: 12,
    ...shadows.soft,
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
  profileMeta: {
    marginTop: 2,
    color: "#2D7F43",
    fontSize: 12.5,
    fontWeight: "800",
  },
  lastMessage: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.75,
  },
});
