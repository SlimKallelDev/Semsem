import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { connectSocket } from "../../services/socketService";
import {
  getMessagesByConversation,
  sendMessage,
} from "../../services/messageService";
import { useUser } from "../../contexts/UserContext";
import { emitNotificationsUpdated } from "../../services/notificationEvents";
import { markNotificationsByResourceAsRead } from "../../services/notificationService";

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const { user } = useUser();

  const currentUserId = user?._id || user?.id || user?.$id || null;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const flatListRef = useRef(null);
  const socket = useMemo(() => connectSocket(), []);

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
    if (!conversationId) return;

    socket.emit("join_conversation", conversationId);

    const handleReceiveMessage = (message) => {
      const messageConversationId =
        message?.conversation?._id ||
        message?.conversation ||
        message?.conversationId;

      if (String(messageConversationId) !== String(conversationId)) return;

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

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [conversationId, socket]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !conversationId || !currentUserId || sending) return;

    try {
      setSending(true);
      setError(null);

      const payload = {
        conversation: conversationId,
        sender: currentUserId,
        text: text.trim(),
      };

      const savedMessage = await sendMessage(payload);

      socket.emit("send_message", {
        ...savedMessage,
        conversationId,
      });

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
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ThemedView style={styles.container}>
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item?._id || `${index}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
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
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
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
    paddingBottom: 12,
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
    paddingTop: 8,
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
