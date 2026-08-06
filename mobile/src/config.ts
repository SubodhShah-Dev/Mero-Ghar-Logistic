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

// Production API endpoint for release builds. Rendered at https://meroghar-backend.onrender.com
const PROD_API_URL = 'https://meroghar-backend.onrender.com'

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
	: PROD_API_URL
