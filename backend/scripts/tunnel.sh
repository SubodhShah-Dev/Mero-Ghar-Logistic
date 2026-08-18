# ShiftSathi helper: start the backend and expose it on a free public URL.
#
# Why: release APKs installed on a phone need to reach the backend even when the
# phone is NOT on the same WiFi as this PC. A Cloudflare quick tunnel creates a
# temporary public HTTPS URL that forwards to localhost:5000. No account, no
# credit card, no cost.
#
# After starting, copy the printed https://<random>.trycloudflare.com URL into
# mobile/src/config.ts (PROD_API_URL) and rebuild the APK. The URL changes every
# time you restart this script.
#
# Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
#   Debian/Ubuntu: sudo dpkg -i <cloudflared-linux-amd64.deb>

set -e

PORT="${PORT:-5000}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install it first:"
  echo "  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

echo "Starting ShiftSathi backend on :$PORT ..."
(cd "$(dirname "$0")/.." && npm start) &
BACKEND_PID=$!

trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT

echo "Opening Cloudflare tunnel to http://localhost:$PORT ..."
cloudflared tunnel --url "http://localhost:$PORT"

kill "$BACKEND_PID" 2>/dev/null || true