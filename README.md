# Davomat - React Native (Expo) Mobil Ilova

## Loyiha Strukturasi

```
attendance-app/
├── app/
│   ├── _layout.tsx       # Root layout (navigation)
│   ├── index.tsx         # Auto-redirect (login/home)
│   ├── login.tsx         # Login ekrani
│   └── home.tsx          # Asosiy ekran (Check-in/Check-out)
├── hooks/
│   └── useAttendance.ts  # Face ID + GPS + API logika
├── services/
│   └── api.ts            # Axios API service
├── constants/
│   └── theme.ts          # Rang, spacing, radius
├── app.config.ts
├── package.json
└── tsconfig.json
```

## O'rnatish

```bash
# 1. Papkaga kiring
cd attendance-app

# 2. Kutubxonalarni o'rnating
npm install

# 3. Expo CLI o'rnating (agar yo'q bo'lsa)
npm install -g expo-cli

# 4. Ilovani ishga tushiring
npx expo start
```

## Muhim: API URL ni sozlash

`services/api.ts` faylida:
```ts
const BASE_URL = "https://your-api.com/api";  // ← O'z serveringiz URL ini qo'ying
```

## Backend Auth Endpoint (qo'shish kerak)

Agar backend'da auth yo'q bo'lsa, `POST /api/auth/login` endpointini qo'shing:

```js
// Node.js / Express
router.post('/auth/login', async (req, res) => {
  const { phoneNumber } = req.body;
  const worker = await Worker.findOne({ phoneNumber });
  
  if (!worker) {
    return res.status(404).json({ message: "Ishchi topilmadi" });
  }
  
  const token = jwt.sign({ id: worker._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  
  res.json({ token, worker });
});
```

## Ruxsatlar (avtomatik)

### iOS (info.plist)
- `NSFaceIDUsageDescription` — Face ID uchun
- `NSLocationWhenInUseUsageDescription` — GPS uchun

### Android
- `USE_BIOMETRIC`, `USE_FINGERPRINT`
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`

## Oqim

```
[Login ekrani]
    ↓ Telefon raqam kiritildi
    ↓ POST /api/auth/login
    ↓ Token + Worker saqlandi (AsyncStorage)
[Home ekrani]
    ↓ "KELDI" bosildi
    ↓ Face ID / Touch ID tekshirildi
    ↓ GPS olindi
    ↓ GET /api/office-location (radius olindi)
    ↓ Masofa hisoblab chiqildi (Haversine)
    ↓ Agar OK → POST /api/attendance/check-in
    ↓ Bugungi yozuvlar yangilandi
```

## Test qilish

Emulatorda Face ID ishlamaydi — `useAttendance.ts` da:
```ts
const compatible = await LocalAuthentication.hasHardwareAsync();
if (!compatible) {
  return true; // ← Dev muhit uchun skip
}
```
Bu qatorni real qurilmada olib tashlang.
