import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Davomat",
  slug: "attendance-app",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "attendance",
  userInterfaceStyle: "dark",
  splash: {
    backgroundColor: "#0A0A0F",
  },
  ios: {
    bundleIdentifier: "com.azimjon.attendanceapp",
    supportsTablet: false,
    infoPlist: {
      NSFaceIDUsageDescription: "Davomat tizimi uchun Face ID talab qilinadi",
      NSLocationWhenInUseUsageDescription:
        "Ishxona hududida ekanligingizni tekshirish uchun GPS talab qilinadi",
    },
  },
  android: {
    package: "com.azimjon.attendanceapp",
    permissions: [
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
    ],
  },
  plugins: [
    "expo-router",
    "expo-local-authentication",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Ishxona hududini tekshirish uchun ruxsat bering.",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "f9f1362c-cfde-495e-ae22-a47069e74f22",
    },
  },
});