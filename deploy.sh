#!/usr/bin/env bash
set -euo pipefail

APP_NAME="wealthadvisor-ai"  # Must match app name in fly.toml

# ── 1. Check flyctl ──────────────────────────────────────────────────────────
if ! command -v flyctl &>/dev/null; then
  echo "flyctl not installed. Run:"
  echo "  curl -L https://fly.io/install.sh | sh"
  echo "Then add it to your PATH and re-run this script."
  exit 1
fi

# ── 2. Check auth ────────────────────────────────────────────────────────────
if ! flyctl auth whoami &>/dev/null; then
  echo "Not logged in to Fly.io. Running: flyctl auth login"
  flyctl auth login
fi

# ── 3. Create app on first run ───────────────────────────────────────────────
if ! flyctl apps list 2>/dev/null | grep -q "^${APP_NAME}"; then
  echo "Creating Fly.io app: ${APP_NAME}"
  flyctl apps create "${APP_NAME}"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  First-time setup: set your API keys as Fly secrets."
  echo "  Run the following (replace the placeholders with real values):"
  echo ""
  echo "  flyctl secrets set \\"
  echo "    PHOENIQS_API_KEY=sk-your-key-here \\"
  echo "    SIX_MCP_TOKEN=your-six-token-here \\"
  echo "    NEWSAPI_KEY=your-event-registry-key-here \\"
  echo "    --app ${APP_NAME}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  read -r -p "Press Enter once you've set the secrets to continue with the deploy..."
fi

# ── 4. Deploy ────────────────────────────────────────────────────────────────
echo "Deploying ${APP_NAME} to Fly.io (remote build)..."
flyctl deploy --remote-only --app "${APP_NAME}"

echo ""
echo "Deploy complete."
echo "  App URL : https://${APP_NAME}.fly.dev"
echo "  Status  : flyctl status --app ${APP_NAME}"
echo "  Logs    : flyctl logs --app ${APP_NAME}"
