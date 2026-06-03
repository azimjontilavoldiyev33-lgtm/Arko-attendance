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
  const enrolled = await LocalAuthentication.isEnrolledAsync();

  // Qurilmada biometrika/ekran qulfi sozlanmagan bo'lsa:
  if (!compatible || !enrolled) {
    // Faqat dev/emulatorda test uchun o'tkazib yuboramiz.
    if (__DEV__) {
      return true;
    }
    // Productionda JIM o'tkazib yubormaymiz — bu xavfsizlik teshigi bo'lar edi.
    throw new Error(
      "Qurilmada Face ID / barmoq izi yoki ekran qulfi sozlanmagan. Telefon sozlamalaridan yoqing."
    );
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Davomatni tasdiqlash uchun Face ID / barmoq izidan foydalaning",
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
  distance: number;
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

  // Ofis joylashuvini olib, masofani hisoblaymiz (darhol UX feedback uchun).
  // Yakuniy qarorni baribir backend qiladi — bu faqat foydalanuvchiga
  // tezroq xabar berish uchun.
  let inRange = true;
  let distance = 0;
  try {
    const office = await getOfficeLocation();
    distance = Math.round(getDistance(lat, lng, office.lat, office.lng) * 1000); // metr
    inRange = distance <= office.radius;
  } catch {
    // Ofis sozlamasini olib bo'lmadi — qarorni backendga qoldiramiz
  }

  return { lat, lng, inRange, distance };
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
      const { lat, lng, inRange, distance } = await verifyLocation();

      if (!inRange) {
        setStatus("error");
        setMessage(
          `Siz ish joyidan ${distance} m uzoqdasiz. Yaqinroq keling.`
        );
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
