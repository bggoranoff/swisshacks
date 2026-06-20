#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:${PORT:-3000}"
fail=0
check() {
  local url="$1" label="$2" method="${3:-GET}" timeout="${4:-10}"
  if [ "$method" = "POST" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" -X POST -H "Content-Type: application/json" -d '{}' "$url" 2>/dev/null || echo "000")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
  fi
  if [ "$status" != "200" ]; then
    echo "FAIL [$status] $label"; fail=1
  else
    echo "OK   $label"
  fi
}
check "$BASE/api/health" "Health"
check "$BASE/api/clients" "Client list"
check "$BASE/api/clients/schneider" "Client detail"
check "$BASE/api/clients/schneider/dna" "DNA" GET 30
check "$BASE/api/clients/schneider/portfolio" "Portfolio" GET 60
check "$BASE/api/clients/schneider/news" "News" GET 15
check "$BASE/api/traces" "Traces"
check "$BASE/api/clients/schneider/advisory" "Advisory" POST 90
check "$BASE/api/integrations" "Integrations" GET 30
check "$BASE/api/audit" "Audit"
exit $fail
