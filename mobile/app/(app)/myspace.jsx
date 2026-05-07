import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import {
  getAppointments,
  updateAppointmentStatus,
} from "../../services/appointmentService";
import MyPetsScreen from "./mypets";
import MyPosts from "./myposts";

const GREEN = "#3DB85C";
const GREEN_DARK = "#227B3E";
const TABS = [
  { value: "pets", label: "Pets", icon: "paw-outline" },
  { value: "posts", label: "Posts", icon: "document-text-outline" },
  { value: "appointments", label: "Appointments", icon: "calendar-outline" },
];

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.userId || value?.$id || null;
};

const getDisplayName = (person) => {
  const explicit = String(person?.name || "").trim();
  return explicit || person?.email || "Semsem user";
};

const readParam = (value) => {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
};

const resolveTab = (value) => {
  const tab = readParam(value);
  return TABS.some((item) => item.value === tab) ? tab : "pets";
};

const resolveParamTab = (value) => {
  const tab = readParam(value);
  return TABS.some((item) => item.value === tab) ? tab : null;
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAppointmentPets = (appointment) => {
  const selectedPets = Array.isArray(appointment?.pets) ? appointment.pets : [];
  const petNames = selectedPets
    .map((pet) => String(pet?.name || "").trim())
    .filter(Boolean);
  const otherPet = String(appointment?.otherPet || "").trim();

  if (otherPet) petNames.push(`Other: ${otherPet}`);

  return petNames.join(", ");
};

const STATUS_META = {
  pending: {
    label: "Waiting for acceptance",
    color: "#C97815",
    bg: "#FFF4E3",
  },
  accepted: {
    label: "Accepted",
    color: GREEN_DARK,
    bg: "#EAF8EE",
  },
  rejected: {
    label: "Declined",
    color: "#C74747",
    bg: "#FDECEC",
  },
  cancelled: {
    label: "Cancelled",
    color: "#707A74",
    bg: "#EFF2F0",
  },
};

function AppointmentStatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;

  return (
    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
      <ThemedText style={[styles.statusPillText, { color: meta.color }]}>
        {meta.label}
      </ThemedText>
    </View>
  );
}

function AppointmentsPanel() {
  const { user } = useUser();
  const currentUserId = getEntityId(user);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadAppointments = useCallback(async (isRefresh = false) => {
    if (!currentUserId) {
      setAppointments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Load appointments error:", error?.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [loadAppointments])
  );

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      setUpdatingId(appointmentId);
      const updated = await updateAppointmentStatus(appointmentId, status);
      setAppointments((current) =>
        current.map((item) =>
          String(getEntityId(item)) === String(appointmentId) ? updated : item
        )
      );
    } catch (error) {
      Alert.alert("Appointment", error?.message || "Failed to update appointment.");
    } finally {
      setUpdatingId(null);
    }
  };

  const renderAppointment = ({ item }) => {
    const appointmentId = getEntityId(item);
    const requesterId = getEntityId(item?.requester);
    const providerId = getEntityId(item?.provider);
    const isProvider = String(providerId) === String(currentUserId);
    const isRequester = String(requesterId) === String(currentUserId);
    const otherPerson = isProvider ? item?.requester : item?.provider;
    const title = isProvider ? "Service request" : "Appointment request";
    const updating = updatingId && String(updatingId) === String(appointmentId);

    return (
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentTopRow}>
          <View style={styles.appointmentIcon}>
            <Ionicons name="calendar" size={20} color={GREEN} />
          </View>

          <View style={styles.appointmentBody}>
            <ThemedText style={styles.appointmentTitle}>{title}</ThemedText>
            <ThemedText style={styles.appointmentPerson} numberOfLines={1}>
              {isProvider ? "From " : "With "}
              {getDisplayName(otherPerson)}
            </ThemedText>
            <ThemedText style={styles.appointmentDate}>
              Requested {formatDate(item?.createdAt) || "recently"}
            </ThemedText>
            {item?.requestedFor ? (
              <ThemedText style={styles.appointmentSchedule}>
                For {formatDateTime(item.requestedFor)}
              </ThemedText>
            ) : null}
          </View>

          <AppointmentStatusPill status={item?.status} />
        </View>

        {item?.note ? (
          <ThemedText style={styles.appointmentNote} numberOfLines={3}>
            {item.note}
          </ThemedText>
        ) : null}

        {formatAppointmentPets(item) ? (
          <View style={styles.appointmentPetsBox}>
            <Ionicons name="paw-outline" size={15} color={GREEN_DARK} />
            <ThemedText style={styles.appointmentPetsText} numberOfLines={2}>
              {formatAppointmentPets(item)}
            </ThemedText>
          </View>
        ) : null}

        {item?.status === "pending" && isProvider ? (
          <View style={styles.appointmentActions}>
            <TouchableOpacity
              style={[styles.appointmentAction, styles.rejectButton]}
              activeOpacity={0.86}
              disabled={Boolean(updating)}
              onPress={() => handleUpdateStatus(appointmentId, "rejected")}
            >
              <ThemedText style={styles.rejectButtonText}>Decline</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.appointmentAction, styles.acceptButton]}
              activeOpacity={0.86}
              disabled={Boolean(updating)}
              onPress={() => handleUpdateStatus(appointmentId, "accepted")}
            >
              {updating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {item?.status === "pending" && isRequester ? (
          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.86}
            disabled={Boolean(updating)}
            onPress={() => handleUpdateStatus(appointmentId, "cancelled")}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel request</ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item, index) => String(getEntityId(item) || index)}
      renderItem={renderAppointment}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAppointments(true)}
          tintColor={GREEN}
        />
      }
      contentContainerStyle={[
        styles.appointmentsList,
        appointments.length === 0 && styles.emptyListContent,
      ]}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={34} color={GREEN} />
          </View>
          <ThemedText style={styles.emptyTitle}>No appointments yet</ThemedText>
          <ThemedText style={styles.emptyText}>
            Appointment requests with service providers will appear here.
          </ThemedText>
        </View>
      }
    />
  );
}

export default function MySpaceScreen() {
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState(() => resolveTab(params?.tab));
  const activeTitle = useMemo(
    () => TABS.find((tab) => tab.value === activeTab)?.label || "Pets",
    [activeTab]
  );

  useEffect(() => {
    const nextTab = resolveParamTab(params?.tab);
    if (!nextTab) return;

    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [params?.tab]);

  const handleChangeTab = (tabValue) => {
    setActiveTab(tabValue);
    router.setParams({ tab: tabValue });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.eyebrow}>Personal area</ThemedText>
          <ThemedText style={styles.title}>My Space</ThemedText>
        </View>
        <ThemedText style={styles.activeTitle}>{activeTitle}</ThemedText>
      </View>

      <View style={styles.segmentedNav}>
        {TABS.map((tab) => {
          const active = activeTab === tab.value;

          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.navButton, active && styles.navButtonActive]}
              activeOpacity={0.86}
              onPress={() => handleChangeTab(tab.value)}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? "#FFFFFF" : "#68746D"}
              />
              <ThemedText
                style={[styles.navButtonText, active && styles.navButtonTextActive]}
                numberOfLines={1}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === "pets" ? <MyPetsScreen /> : null}
        {activeTab === "posts" ? <MyPosts /> : null}
        {activeTab === "appointments" ? <AppointmentsPanel /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4ECE7",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#7A857F",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: "#17201A",
    fontSize: 25,
    fontWeight: "900",
  },
  activeTitle: {
    color: GREEN_DARK,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  segmentedNav: {
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4ECE7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    gap: 6,
  },
  navButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    backgroundColor: "#F2F6F3",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 6,
  },
  navButtonActive: {
    backgroundColor: GREEN,
  },
  navButtonText: {
    flexShrink: 1,
    color: "#68746D",
    fontSize: 11.5,
    fontWeight: "900",
  },
  navButtonTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  appointmentCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E1ECE5",
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#173423",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  appointmentTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  appointmentIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentBody: {
    flex: 1,
    minWidth: 0,
  },
  appointmentTitle: {
    color: "#17201A",
    fontSize: 16,
    fontWeight: "900",
  },
  appointmentPerson: {
    marginTop: 2,
    color: "#4E5D54",
    fontSize: 13.5,
    fontWeight: "700",
  },
  appointmentDate: {
    marginTop: 2,
    color: "#8B9690",
    fontSize: 12,
    fontWeight: "700",
  },
  appointmentSchedule: {
    marginTop: 3,
    color: GREEN_DARK,
    fontSize: 12.5,
    fontWeight: "900",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 120,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "900",
    textAlign: "center",
  },
  appointmentNote: {
    marginTop: 12,
    color: "#526058",
    fontSize: 13.5,
    lineHeight: 20,
  },
  appointmentPetsBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDEEE2",
    backgroundColor: "#F5FCF6",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  appointmentPetsText: {
    flex: 1,
    minWidth: 0,
    color: "#315D42",
    fontSize: 12.5,
    fontWeight: "800",
  },
  appointmentActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  appointmentAction: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    backgroundColor: "#FFF2F2",
    borderWidth: 1,
    borderColor: "#F1CCCC",
  },
  rejectButtonText: {
    color: "#B94141",
    fontSize: 13,
    fontWeight: "900",
  },
  acceptButton: {
    backgroundColor: GREEN,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  cancelButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E1E7E3",
    backgroundColor: "#F9FBFA",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cancelButtonText: {
    color: "#68746D",
    fontSize: 12.5,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingTop: 78,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 26,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: "#17201A",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    color: "#748079",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
