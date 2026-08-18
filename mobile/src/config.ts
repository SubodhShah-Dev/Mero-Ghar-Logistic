import { NativeModules, Platform } from 'react-native'

// Bare React Native does not resolve process.env at runtime, so the API base
// URL is derived dynamically.
//
// In dev, Metro injects its own host into the bundle URL (NativeModules
// SourceCode.scriptURL), e.g. http://<dev-machine>:8081/index.bundle. That
// host is where the backend also runs, so we reuse it:
//   - Android emulator: 10.0.2.2 maps to the host's loopback
//   - Physical device: Metro's host is the dev machine's LAN IP, so it works
//     as long as the phone and computer are on the same network
const DEFAULT_PORT = 5000

// Production API endpoints for release builds (APKs installed on a phone).
//
// The app probes these in order on startup and caches the first responder in
// AsyncStorage (see services/api.ts), so no rebuild is needed when moving
// between venues:
//   1. Cloud (Render + TiDB) — works anywhere with internet.
//   2. USB (adb reverse tcp:5000 tcp:5000) — maps the phone's 127.0.0.1 to the
//      PC running the local backend.
//   3. Same WiFi — the PC's LAN IP with the local (XAMPP) backend running.
//
// When the phone is NOT on the same network as the PC and there is no internet,
// keep a run of backend/scripts/tunnel.sh alive and add its printed
// https://<random>.trycloudflare.com URL here, then rebuild the APK once.
const PROD_API_URLS: string[] = [
  'https://meroghar-backend.onrender.com',
  'http://127.0.0.1:5000',
  'http://192.168.1.76:5000',
]

function resolveDevHost(): string {
  try {
    const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/)
      const host = match?.[1]
      if (host) {
        if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
          return '10.0.2.2'
        }
        return host
      }
    }
  } catch {}
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
}

export const API_BASE_URL = __DEV__
	? `http://${resolveDevHost()}:${DEFAULT_PORT}`
	: PROD_API_URLS[0]

export { PROD_API_URLS }
