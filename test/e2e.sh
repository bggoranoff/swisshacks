#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:${PORT:-3000}"
fail=0
check() {
  local url="$1" label="$2" method="${3:-GET}"
  if [ "$method" = "POST" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$url" 2>/dev/null || echo "000")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  fi
  if [ "$status" != "200" ]; then
    echo "FAIL [$status] $label"; fail=1
  else
    if [ "$method" = "POST" ]; then
      body=$(curl -sf -X POST -H "Content-Type: application/json" -d '{}' "$url" 2>/dev/null || echo "")
    else
      body=$(curl -sf "$url" 2>/dev/null || echo "")
    fi
    if [ -n "$body" ] && ! echo "$body" | python3 -c "import sys,json;json.load(sys.stdin)" 2>/dev/null; then
      echo "FAIL [invalid JSON] $label"; fail=1
    else
      echo "OK   $label"
    fi
  fi
}
check "$BASE/api/health" "Health"
check "$BASE/api/clients" "Client list"
check "$BASE/api/clients/schneider" "Client detail"
check "$BASE/api/clients/schneider/dna" "DNA"
check "$BASE/api/clients/schneider/portfolio" "Portfolio"
check "$BASE/api/clients/schneider/news" "News"
check "$BASE/api/clients/schneider/advisory" "Advisory" POST
check "$BASE/api/traces" "Traces"
check "$BASE/api/integrations" "Integrations"
exit $fail
