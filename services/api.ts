import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// O'z serveringiz URL ini qo'ying
const BASE_URL = "arko-attendance-production.up.railway.app";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptor — token qo'shish
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Worker {
  _id: string;
  fullName: string;
  phoneNumber: string;
  telegramChatId?: string;
  position: string;
  createdAt: string;
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

export const loginWorker = async (phoneNumber: string): Promise<Worker> => {
  const res = await api.post("/auth/login", { phoneNumber });
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
  const res = await api.post("/attendance/check-in", payload);
  return res.data;
};

export const checkOut = async (
  payload: AttendancePayload
): Promise<AttendanceRecord> => {
  const res = await api.post("/attendance/check-out", payload);
  return res.data;
};

export const getAttendanceReport = async (params: {
  workerId: string;
  startDate?: string;
  endDate?: string;
}): Promise<AttendanceRecord[]> => {
  const res = await api.get("/attendance/report", { params });
  return res.data;
};

// ─── Office Location ──────────────────────────────────────────────────────────

export const getOfficeLocation = async (): Promise<OfficeLocation> => {
  const res = await api.get("/office-location");
  return res.data;
};

export default api;
