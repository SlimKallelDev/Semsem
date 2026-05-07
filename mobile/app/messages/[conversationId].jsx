import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { connectSocket } from "../../services/socketService";
import {
  getConversationById,
  getMessagesByConversation,
  sendMessage,
} from "../../services/messageService";
import { useUser } from "../../contexts/UserContext";
import { emitNotificationsUpdated } from "../../services/notificationEvents";
import { markNotificationsByResourceAsRead } from "../../services/notificationService";

const PLACEHOLDER_AVATAR = "https://via.placeholder.com/100x100.png?text=User";

const getEntityId = (value) => value?._id || value?.id || value?.$id || null;

const getDisplayName = (person) => {
  const explicit = String(
    person?.name || person?.fullName || person?.username || ""
  ).trim();

  if (explicit) {
    return explicit;
  }

  const first = String(person?.firstName || "").trim();
  const last = String(person?.lastName || "").trim();
  const fullName = [first, last].filter(Boolean).join(" ");

  return fullName || String(person?.email || "Conversation").trim();
};

export default function ChatScreen() {
  const { conversationId: rawConversationId } = useLocalSearchParams();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const conversationId = Array.isArray(rawConversationId)
    ? rawConversationId[0]
    : rawConversationId;

  const currentUserId = user?._id || user?.id || user?.$id || null;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const socket = useMemo(() => connectSocket(), []);
  const currentUserName = useMemo(() => getDisplayName(user), [user]);

  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getMessagesByConversation(conversationId);
        setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading messages:", err?.message || err);
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    let active = true;

    const loadConversation = async () => {
      try {
        const conversation = await getConversationById(conversationId);

        if (!active) return;

        const participants = Array.isArray(conversation?.participants)
          ? conversation.participants
          : [];

        const otherParticipant = participants.find((candidate) => {
          const candidateId = getEntityId(candidate);
          return String(candidateId) !== String(currentUserId);
        });

        if (otherParticipant) {
          setParticipant(otherParticipant);
        }
      } catch (err) {
        console.error("Error loading conversation:", err?.message || err);
      }
    };

    loadConversation();

    return () => {
      active = false;
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (participant || !currentUserId || messages.length === 0) return;

    const fallbackParticipant = messages
      .map((message) => message?.sender)
      .find((sender) => String(getEntityId(sender)) !== String(currentUserId));

    if (fallbackParticipant) {
      setParticipant(fallbackParticipant);
    }
  }, [currentUserId, messages, participant]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    markNotificationsByResourceAsRead({
      resourceType: "conversation",
      resourceId: conversationId,
    })
      .then(() => {
        emitNotificationsUpdated();
      })
      .catch((error) => {
        console.error(
          "Error marking conversation notifications as read:",
          error?.message || error
        );
      });
  }, [conversationId, currentUserId]);

  useEffect(() => {
    setTypingUsers({});
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    isTypingRef.current = false;
  }, [conversationId]);

  const emitTypingStart = useCallback(() => {
    if (!conversationId || !currentUserId || isTypingRef.current) return;

    isTypingRef.current = true;
    socket.emit("typing_start", {
      conversationId,
      userId: currentUserId,
      userName: currentUserName,
    });
  }, [conversationId, currentUserId, currentUserName, socket]);

  const emitTypingStop = useCallback(() => {
    if (!conversationId || !currentUserId || !isTypingRef.current) return;

    isTypingRef.current = false;
    socket.emit("typing_stop", {
      conversationId,
      userId: currentUserId,
      userName: currentUserName,
    });
  }, [conversationId, currentUserId, currentUserName, socket]);

  useEffect(() => {
    if (!conversationId) return;

    const joinCurrentConversation = () => {
      socket.emit("join_conversation", conversationId);
    };

    joinCurrentConversation();

    const handleReceiveMessage = (message) => {
      const messageConversationId =
        message?.conversation?._id ||
        message?.conversation ||
        message?.conversationId;

      if (String(messageConversationId) !== String(conversationId)) return;

      const senderId = getEntityId(message?.sender) || message?.sender;
      if (senderId) {
        setTypingUsers((prev) => {
          const key = String(senderId);
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (item) =>
            item?._id &&
            message?._id &&
            String(item._id) === String(message._id)
        );

        if (alreadyExists) return prev;
        return [...prev, message];
      });
    };

    const handleTypingStart = (payload = {}) => {
      const payloadConversationId =
        payload?.conversationId ||
        payload?.conversation?._id ||
        payload?.conversation;

      if (String(payloadConversationId) !== String(conversationId)) return;

      const typingUserId = payload?.userId;
      if (typingUserId && String(typingUserId) === String(currentUserId)) return;

      const key = String(typingUserId || payload?.userName || "typing-user");
      setTypingUsers((prev) => ({
        ...prev,
        [key]: {
          userId: typingUserId || null,
          userName: payload?.userName || "Someone",
        },
      }));
    };

    const handleTypingStop = (payload = {}) => {
      const payloadConversationId =
        payload?.conversationId ||
        payload?.conversation?._id ||
        payload?.conversation;

      if (String(payloadConversationId) !== String(conversationId)) return;

      const key = String(payload?.userId || payload?.userName || "typing-user");
      setTypingUsers((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);
    socket.on("connect", joinCurrentConversation);

    return () => {
      emitTypingStop();
      socket.emit("leave_conversation", conversationId);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      socket.off("connect", joinCurrentConversation);
    };
  }, [conversationId, currentUserId, emitTypingStop, socket]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTypingStop();
    };
  }, [emitTypingStop]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleTextChange = (value) => {
    setText(value);

    if (!conversationId || !currentUserId) return;

    const hasText = String(value || "").trim().length > 0;

    if (!hasText) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitTypingStop();
      return;
    }

    emitTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const handleSend = async () => {
    if (!text.trim() || !conversationId || !currentUserId || sending) return;

    try {
      emitTypingStop();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      setSending(true);
      setError(null);

      const payload = {
        conversation: conversationId,
        sender: currentUserId,
        text: text.trim(),
      };

      const savedMessage = await sendMessage(payload);

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (item) =>
            item?._id &&
            savedMessage?._id &&
            String(item._id) === String(savedMessage._id)
        );

        if (alreadyExists) return prev;
        return [...prev, savedMessage];
      });

      setText("");
    } catch (err) {
      console.error("Error sending message:", err?.message || err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const participantId = getEntityId(participant);
  const participantName = getDisplayName(participant);
  const participantAvatar = participant?.avatar || participant?.image || PLACEHOLDER_AVATAR;
  const typingIndicatorText = useMemo(() => {
    const activeTypers = Object.values(typingUsers);

    if (activeTypers.length === 0) return "";

    if (activeTypers.length === 1) {
      const label = activeTypers[0]?.userName || participantName || "Someone";
      return `${label} is typing...`;
    }

    return "Several people are typing...";
  }, [participantName, typingUsers]);

  const handleOpenParticipantProfile = () => {
    if (!participantId) return;
    router.push(`/user/${participantId}`);
  };

  const renderMessage = ({ item }) => {
    const senderId = item?.sender?._id || item?.sender;
    const isMine = String(senderId) === String(currentUserId);

    return (
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.myMessage : styles.otherMessage,
        ]}
      >
        {!isMine && item?.sender?.name ? (
          <ThemedText style={styles.senderName}>{item.sender.name}</ThemedText>
        ) : null}
        <ThemedText style={styles.messageText}>{item.text}</ThemedText>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar
          title="Messages"
          centerContent={
            <View style={styles.chatHeaderCenter}>
              <Image source={{ uri: participantAvatar }} style={styles.chatHeaderAvatar} />
              <View style={styles.chatHeaderTextWrap}>
                <ThemedText style={styles.chatHeaderName} numberOfLines={1}>
                  {participantName}
                </ThemedText>
                <ThemedText style={styles.chatHeaderHint} numberOfLines={1}>
                  Voir le profil
                </ThemedText>
              </View>
            </View>
          }
          onCenterPress={handleOpenParticipantProfile}
          centerDisabled={!participantId}
        />
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <AppTopBar
        title="Messages"
        centerContent={
          <View style={styles.chatHeaderCenter}>
            <Image source={{ uri: participantAvatar }} style={styles.chatHeaderAvatar} />
            <View style={styles.chatHeaderTextWrap}>
              <ThemedText style={styles.chatHeaderName} numberOfLines={1}>
                {participantName}
              </ThemedText>
              <ThemedText style={styles.chatHeaderHint} numberOfLines={1}>
                Voir le profil
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#95A09A" />
          </View>
        }
        onCenterPress={handleOpenParticipantProfile}
        centerDisabled={!participantId}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "height" : undefined}
      >
        <ThemedView style={styles.container}>
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item?._id || `${index}`}
            renderItem={renderMessage}
            style={styles.messagesListView}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.typingIndicatorWrap}>
            {typingIndicatorText ? (
              <ThemedText style={styles.typingIndicatorText}>
                {typingIndicatorText}
              </ThemedText>
            ) : null}
          </View>

          <View
            style={[
              styles.inputRow,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <TextInput
              value={text}
              onChangeText={handleTextChange}
              onBlur={emitTypingStop}
              placeholder="Write a message..."
              style={styles.input}
              multiline
            />

            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              disabled={sending}
            >
              <ThemedText style={styles.sendButtonText}>
                {sending ? "..." : "Send"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  chatHeaderCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E7ECE9",
    borderWidth: 1,
    borderColor: "#E1E7E3",
  },
  chatHeaderTextWrap: {
    marginLeft: 8,
    marginRight: 4,
    minWidth: 0,
    maxWidth: "72%",
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B241F",
  },
  chatHeaderHint: {
    marginTop: 1,
    fontSize: 11.5,
    color: "#87928B",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: "#cc475a",
    textAlign: "center",
    marginBottom: 12,
  },
  messagesList: {
    paddingBottom: 4,
  },
  messagesListView: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#d7f7c8",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 6,
  },
  typingIndicatorWrap: {
    minHeight: 22,
    justifyContent: "center",
    paddingHorizontal: 4,
    marginTop: 2,
  },
  typingIndicatorText: {
    fontSize: 12.5,
    color: "#6C7972",
    fontWeight: "600",
    fontStyle: "italic",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  sendButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
