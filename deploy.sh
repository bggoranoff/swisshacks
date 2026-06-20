#!/usr/bin/env bash
set -euo pipefail

APP_NAME="wealthadvisor-ai"  # Must match app name in fly.toml
ENV_FILE="${1:-.env}"         # Defaults to .env, override: ./deploy.sh /path/to/.env

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
if ! flyctl status --app "${APP_NAME}" &>/dev/null; then
  echo "Creating Fly.io app: ${APP_NAME}"
  flyctl apps create "${APP_NAME}"
fi

# ── 4. Sync secrets from .env ────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  echo "Syncing secrets from ${ENV_FILE}..."
  # Stage secrets without triggering a restart — the deploy below will activate them.
  # Syncs only the three API keys; all other vars are in fly.toml [env].
  grep -E '^(PHOENIQS_API_KEY|SIX_MCP_TOKEN|NEWSAPI_KEY)=' "$ENV_FILE" \
    | flyctl secrets import --stage --app "${APP_NAME}"
else
  echo "Warning: ${ENV_FILE} not found — skipping secret sync."
  echo "Tip: copy .env.example to .env, fill in your keys, and re-run."
fi

# ── 5. Deploy ────────────────────────────────────────────────────────────────
echo "Deploying ${APP_NAME} to Fly.io (remote build)..."
flyctl deploy --remote-only --no-cache --app "${APP_NAME}"

echo ""
echo "Deploy complete."
echo "  App URL : https://${APP_NAME}.fly.dev"
echo "  Status  : flyctl status --app ${APP_NAME}"
echo "  Logs    : flyctl logs --app ${APP_NAME}"
