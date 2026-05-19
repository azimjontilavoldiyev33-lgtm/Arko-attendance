import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { loginWorker } from "../services/api";
import { Colors, Spacing, Radius } from "../constants/theme";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleaned = "+998" + phone.replace(/\s/g, "");
    if (cleaned.length < 9) {
      Alert.alert("Xatolik", "Telefon raqamini to'g'ri kiriting");
      return;
    }

    setLoading(true);
    try {
      await loginWorker(cleaned);
      router.replace("/home");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Ishchi topilmadi. Raqamni tekshiring.";
      Alert.alert("Kirish xatosi", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Logo area */}
      <View style={styles.logoArea}>
        <View style={styles.logoRing}>
          <View style={styles.logoInner}>
            <Text style={styles.logoIcon}>◈</Text>
          </View>
        </View>
        <Text style={styles.appName}>DAVOMAT</Text>
        <Text style={styles.appTagline}>Aqlli davomat tizimi</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tizimga kirish</Text>
        <Text style={styles.cardSubtitle}>
          Telefon raqamingizni kiriting
        </Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputPrefix}>+998</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="90 123 45 67"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            maxLength={13}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bg} size="small" />
          ) : (
            <Text style={styles.btnText}>Kirish →</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Kirish muammosi bo'lsa, admin bilan bog'laning
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },

  // Logo
  logoArea: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  logoIcon: {
    fontSize: 28,
    color: Colors.accent,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 6,
  },
  appTagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 1,
  },

  // Card
  card: {
    width: "100%",
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  // Input
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  inputPrefix: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: "600",
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    color: Colors.textPrimary,
    fontSize: 18,
    letterSpacing: 1,
  },

  // Button
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  footer: {
    marginTop: Spacing.xl,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
