import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { getStoredWorker, logout, getAttendanceReport, Worker, AttendanceRecord } from "../services/api";
import { useAttendance } from "../hooks/useAttendance";
import { Colors, Spacing, Radius } from "../constants/theme";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ type }: { type: "check-in" | "check-out" }) {
  const isIn = type === "check-in";
  return (
    <View style={[styles.badge, isIn ? styles.badgeIn : styles.badgeOut]}>
      <Text style={[styles.badgeText, isIn ? styles.badgeTextIn : styles.badgeTextOut]}>
        {isIn ? "▲ Keldi" : "▼ Ketdi"}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const { status, message, performCheckIn, performCheckOut, reset } =
    useAttendance();

  // Load worker & today's records
  const loadData = useCallback(async () => {
    const w = await getStoredWorker();
    if (!w) {
      router.replace("/login");
      return;
    }
    setWorker(w);

    setLoadingRecords(true);
    try {
      const { startDate, endDate } = todayRange();
      const data = await getAttendanceReport({
        workerId: w._id,
        startDate,
        endDate,
      });
      setRecords(data.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1)));
    } catch {
      // Xato bo'lsa yopiq qolsin
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // After action refresh
  useEffect(() => {
    if (status === "success") {
      setTimeout(() => {
        reset();
        loadData();
      }, 2500);
    }
  }, [status]);

  const handleAction = (type: "check-in" | "check-out") => {
    if (!worker) return;
    if (status === "loading") return;

    if (type === "check-in") {
      performCheckIn(worker._id);
    } else {
      performCheckOut(worker._id);
    }
  };

  const handleLogout = () => {
    Alert.alert("Chiqish", "Tizimdan chiqmoqchimisiz?", [
      { text: "Bekor", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  // ─── Status overlay ─────────────────────────────────────────────────────
  const isProcessing = status === "loading";
  const statusColor =
    status === "success"
      ? Colors.success
      : status === "error"
      ? Colors.error
      : Colors.accent;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Salom,</Text>
          <Text style={styles.workerName}>{worker?.fullName ?? "..."}</Text>
          <Text style={styles.position}>{worker?.position ?? ""}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>⎋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <View style={styles.dateBar}>
          <View style={styles.dateDot} />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("uz-UZ", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Status message */}
        {status !== "idle" && (
          <View
            style={[
              styles.statusBox,
              {
                borderColor: statusColor,
                backgroundColor: `${statusColor}12`,
              },
            ]}
          >
            {isProcessing && (
              <ActivityIndicator
                color={statusColor}
                size="small"
                style={{ marginRight: 10 }}
              />
            )}
            <Text style={[styles.statusMsg, { color: statusColor }]}>
              {message}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {/* Check-in */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.checkInBtn,
              isProcessing && styles.actionBtnDisabled,
            ]}
            onPress={() => handleAction("check-in")}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>▲</Text>
            </View>
            <Text style={styles.actionLabel}>KELDI</Text>
            <Text style={styles.actionSub}>Check-in</Text>
          </TouchableOpacity>

          {/* Check-out */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.checkOutBtn,
              isProcessing && styles.actionBtnDisabled,
            ]}
            onPress={() => handleAction("check-out")}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconWrap, styles.checkOutIconWrap]}>
              <Text style={[styles.actionIcon, styles.checkOutIcon]}>▼</Text>
            </View>
            <Text style={[styles.actionLabel, styles.checkOutLabel]}>KETDI</Text>
            <Text style={styles.actionSub}>Check-out</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Qanday ishlaydi?</Text>
          {[
            ["◈", "Face ID yoki Touch ID bilan tasdiqlaysiz"],
            ["◎", "GPS orqali ishxona hududida ekanligingiz tekshiriladi"],
            ["◉", "Ikkisi ham to'g'ri bo'lsa, davomat qayd etiladi"],
          ].map(([icon, text]) => (
            <View key={text} style={styles.infoRow}>
              <Text style={styles.infoIcon}>{icon}</Text>
              <Text style={styles.infoText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Today's records */}
        <Text style={styles.sectionTitle}>Bugungi harakatlar</Text>

        {loadingRecords ? (
          <ActivityIndicator
            color={Colors.accent}
            style={{ marginTop: Spacing.lg }}
          />
        ) : records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>◌</Text>
            <Text style={styles.emptyText}>Bugun hali davomat yo'q</Text>
          </View>
        ) : (
          records.map((r) => (
            <View key={r._id} style={styles.recordCard}>
              <View style={styles.recordLeft}>
                <StatusBadge type={r.type} />
                <View style={{ marginLeft: Spacing.md }}>
                  <Text style={styles.recordTime}>{formatTime(r.timestamp)}</Text>
                  <Text style={styles.recordDate}>{formatDate(r.timestamp)}</Text>
                </View>
              </View>
              <View style={styles.recordRight}>
                <Text
                  style={[
                    styles.faceTag,
                    r.faceVerified ? styles.faceOk : styles.faceFail,
                  ]}
                >
                  {r.faceVerified ? "Face ✓" : "Face ✗"}
                </Text>
                <Text style={styles.coordText}>
                  {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  greeting: { fontSize: 13, color: Colors.textSecondary, letterSpacing: 1 },
  workerName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 2,
  },
  position: { fontSize: 13, color: Colors.accent, marginTop: 2 },
  logoutBtn: {
    width: 40,
    height: 40,
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutIcon: { fontSize: 18, color: Colors.textSecondary },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg },

  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginRight: Spacing.sm,
  },
  dateText: { fontSize: 13, color: Colors.textSecondary, letterSpacing: 0.5 },

  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statusMsg: { fontSize: 14, fontWeight: "500", flex: 1 },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: "center",
    minHeight: 140,
    justifyContent: "center",
  },
  actionBtnDisabled: { opacity: 0.5 },
  checkInBtn: {
    backgroundColor: Colors.successGlow,
    borderColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  checkOutBtn: {
    backgroundColor: Colors.errorGlow,
    borderColor: Colors.error,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  checkOutIconWrap: { backgroundColor: Colors.error },
  actionIcon: { fontSize: 20, color: "#fff", fontWeight: "800" },
  checkOutIcon: {},
  actionLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.success,
    letterSpacing: 2,
  },
  checkOutLabel: { color: Colors.error },
  actionSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 1,
  },

  // Info card
  infoCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoIcon: { fontSize: 16, color: Colors.accent, marginRight: Spacing.sm, width: 24 },
  infoText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },

  // Records
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  recordCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  recordLeft: { flexDirection: "row", alignItems: "center" },
  recordRight: { alignItems: "flex-end" },
  recordTime: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  recordDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  faceTag: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    overflow: "hidden",
    marginBottom: 4,
  },
  faceOk: { backgroundColor: Colors.successGlow, color: Colors.success },
  faceFail: { backgroundColor: Colors.errorGlow, color: Colors.error },
  coordText: { fontSize: 10, color: Colors.textMuted },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeIn: { backgroundColor: Colors.successGlow },
  badgeOut: { backgroundColor: Colors.errorGlow },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeTextIn: { color: Colors.success },
  badgeTextOut: { color: Colors.error },

  emptyBox: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyIcon: { fontSize: 32, color: Colors.textMuted, marginBottom: Spacing.sm },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
