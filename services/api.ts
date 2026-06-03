import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// CRM (Next.js) backend. ngrok URL har qayta ishga tushganda o'zgaradi —
// EXPO_PUBLIC_API_URL orqali o'rnatish mumkin (kodga tegmasdan).
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://grieving-plow-credit.ngrok-free.dev/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    // ngrok bepul sahifa ogohlantirishini o'tkazib yuborish (HTML emas, JSON)
    "ngrok-skip-browser-warning": "true",
  },
});

// Request interceptor — token qo'shish
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — xatolarni log qilish (debug uchun)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.error("[API Error]", {
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data,
        status: error.response?.status,
        responseData: error.response?.data,
      });
    }
    return Promise.reject(error);
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Telefon raqamini tozalaydi va standart formatga keltiradi: +998XXXXXXXXX
 *
 * Muammo: LoginScreen foydalanuvchi kiritgan raqamga "+998" prefix qo'shadi,
 * lekin foydalanuvchi "97 460 1520" (bo'sh joyli) kiritsa natija
 * "+99897 460 1520" bo'lib, backend topib bera olmaydi.
 *
 * Bu funksiya barcha formatlarni qabul qiladi:
 *   "974601520"        → "+998974601520"
 *   "974 601 520"      → "+998974601520"
 *   "998974601520"     → "+998974601520"
 *   "+998974601520"    → "+998974601520"
 *   "+998 97 460 1520" → "+998974601520"
 *   "+998-97-460-1520" → "+998974601520"
 */
export const normalizePhone = (raw: string): string => {
  // 1. Faqat raqamlarni qoldirish (bo'shliq, tire, qavs, plyus olib tashlash)
  const digits = raw.replace(/\D/g, "");

  // 2. Prefix strategiyasi
  if (digits.startsWith("998") && digits.length === 12) {
    // "998974601520" → "+998974601520"
    return "+" + digits;
  }

  if (digits.length === 9) {
    // "974601520" → "+998974601520"
    return "+998" + digits;
  }

  // Boshqa holatlarda ham "+998" ni tekshirib qo'shish
  if (!digits.startsWith("998")) {
    return "+998" + digits;
  }

  return "+" + digits;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Worker {
  _id: string;
  fullName: string;     // CRM Worker modeli "fullName" ishlatadi
  phoneNumber: string;
  position?: string;
  code?: string;
  salary?: number;
  telegramChatId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendancePayload {
  workerId: string;
  lat: number;
  lng: number;
  faceVerified: boolean;
}

export interface AttendanceRecord {
  _id: string;
  workerId: string;
  type: "check-in" | "check-out";
  lat: number;
  lng: number;
  faceVerified: boolean;
  timestamp: string;
}

export interface OfficeLocation {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginWorker = async (rawPhone: string): Promise<Worker> => {
  // ✅ FIX: raqamni tozalab, standart formatga keltirish
  const phoneNumber = normalizePhone(rawPhone);

  if (__DEV__) {
    console.log("[loginWorker] raw:", rawPhone, "→ normalized:", phoneNumber);
  }

  const res = await api.post("/mobile/auth/login", { phoneNumber });

  if (res.data.token) {
    await AsyncStorage.setItem("auth_token", res.data.token);
    await AsyncStorage.setItem("worker", JSON.stringify(res.data.worker));
  }

  return res.data.worker;
};

export const getStoredWorker = async (): Promise<Worker | null> => {
  const raw = await AsyncStorage.getItem("worker");
  return raw ? JSON.parse(raw) : null;
};

export const logout = async () => {
  await AsyncStorage.multiRemove(["auth_token", "worker"]);
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const checkIn = async (
  payload: AttendancePayload
): Promise<AttendanceRecord> => {
  const res = await api.post("/mobile/attendance/check-in", payload);
  return res.data.data;
};

export const checkOut = async (
  payload: AttendancePayload
): Promise<AttendanceRecord> => {
  const res = await api.post("/mobile/attendance/check-out", payload);
  return res.data.data;
};

export const getAttendanceReport = async (params: {
  workerId: string;
  startDate?: string;
  endDate?: string;
}): Promise<AttendanceRecord[]> => {
  const res = await api.get("/mobile/attendance/report", { params });
  return res.data.data;
};

// ─── Office Location ──────────────────────────────────────────────────────────

export const getOfficeLocation = async (): Promise<OfficeLocation> => {
  const res = await api.get("/mobile/office-location");
  return res.data.data;
};

export default api;