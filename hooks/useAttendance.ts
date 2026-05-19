import { useState, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import { checkIn, checkOut, getOfficeLocation, AttendancePayload } from "../services/api";

// ─── Haversine formula (km) ───────────────────────────────────────────────────
function getDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type AttendanceStatus = "idle" | "loading" | "success" | "error";

interface UseAttendanceReturn {
  status: AttendanceStatus;
  message: string;
  performCheckIn: (workerId: string) => Promise<void>;
  performCheckOut: (workerId: string) => Promise<void>;
  reset: () => void;
}

export function useAttendance(): UseAttendanceReturn {
  const [status, setStatus] = useState<AttendanceStatus>("idle");
  const [message, setMessage] = useState("");

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage("");
  }, []);

  // ─── Step 1: Face ID ──────────────────────────────────────────────────────
  const verifyFace = async (): Promise<boolean> => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      // Dev/test muhiti uchun — real qurilmada olib tashlang
      return true;
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      setMessage("Face ID yoki Touch ID ro'yxatdan o'tilmagan");
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Davomatni tasdiqlash uchun Face ID dan foydalaning",
      fallbackLabel: "PIN kodni kiriting",
      cancelLabel: "Bekor qilish",
      disableDeviceFallback: false,
    });

    return result.success;
  };

  // ─── Step 2: GPS ──────────────────────────────────────────────────────────
  const verifyLocation = async (): Promise<{
    lat: number;
    lng: number;
    inRange: boolean;
  }> => {
    const { status: permStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (permStatus !== "granted") {
      throw new Error("GPS ruxsati berilmadi");
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude: lat, longitude: lng } = loc.coords;

    // Ishxona joylashuvini olish
    const office = await getOfficeLocation();
    const distanceKm = getDistance(lat, lng, office.lat, office.lng);
    const radiusKm = office.radius / 1000; // metr → km

    return { lat, lng, inRange: distanceKm <= radiusKm };
  };

  // ─── Shared logic ─────────────────────────────────────────────────────────
  const perform = async (
    workerId: string,
    type: "check-in" | "check-out"
  ) => {
    setStatus("loading");
    setMessage("Face ID tekshirilmoqda...");

    try {
      const faceVerified = await verifyFace();
      if (!faceVerified) {
        setStatus("error");
        setMessage("Face ID tasdiqlanmadi. Qaytadan urinib ko'ring.");
        return;
      }

      setMessage("GPS joylashuv aniqlanmoqda...");
      const { lat, lng, inRange } = await verifyLocation();

      if (!inRange) {
        setStatus("error");
        setMessage("Siz ishxona hududida emassiz. Yaqinroq keling.");
        return;
      }

      const payload: AttendancePayload = { workerId, lat, lng, faceVerified: true };

      setMessage(
        type === "check-in" ? "Kelish qayd etilmoqda..." : "Ketish qayd etilmoqda..."
      );

      if (type === "check-in") {
        await checkIn(payload);
      } else {
        await checkOut(payload);
      }

      setStatus("success");
      setMessage(
        type === "check-in"
          ? "✅ Kelishingiz muvaffaqiyatli qayd etildi!"
          : "✅ Ketishingiz muvaffaqiyatli qayd etildi!"
      );
    } catch (err: any) {
      setStatus("error");
      const msg =
        err?.response?.data?.message || err?.message || "Noma'lum xatolik";
      setMessage(`Xatolik: ${msg}`);
    }
  };

  const performCheckIn = (workerId: string) => perform(workerId, "check-in");
  const performCheckOut = (workerId: string) => perform(workerId, "check-out");

  return { status, message, performCheckIn, performCheckOut, reset };
}
