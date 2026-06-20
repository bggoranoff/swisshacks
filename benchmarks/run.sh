#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:${PORT:-3000}"
PASS=0
FAIL=0
TOTAL=0

check() {
  TOTAL=$((TOTAL + 1))
  local label="$1" result="$2"
  if [ "$result" = "true" ]; then
    echo "PASS  $label"; PASS=$((PASS + 1))
  else
    echo "FAIL  $label"; FAIL=$((FAIL + 1))
  fi
}

echo "=== WealthAdvisor AI Benchmark Suite ==="
echo "Server: $BASE"
echo ""

for id in schneider huber raeber ammann; do
  echo "--- $id ---"

  # DNA benchmarks
  dna=$(curl -sf --max-time 30 $BASE/api/clients/$id/dna 2>/dev/null)
  if [ -z "$dna" ]; then
    echo "FAIL  $id DNA endpoint unreachable"
    FAIL=$((FAIL + 4)); TOTAL=$((TOTAL + 4))
    continue
  fi

  vals=$(echo "$dna" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']['values']))")
  check "$id DNA values >= 5" "$([ "$vals" -ge 5 ] && echo true || echo false)"

  risks=$(echo "$dna" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']['riskSensitivities']))")
  check "$id DNA risks >= 2" "$([ "$risks" -ge 2 ] && echo true || echo false)"

  evidence=$(echo "$dna" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data'].get('evidence',[])))")
  check "$id DNA has evidence" "$([ "$evidence" -gt 0 ] && echo true || echo false)"

  # Advisory benchmarks
  adv=$(curl -sf --max-time 60 -X POST -H 'Content-Type: application/json' -d '{}' $BASE/api/clients/$id/advisory 2>/dev/null)
  if [ -n "$adv" ]; then
    has_reasoning=$(echo "$adv" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print('true' if d.get('reasoning') else 'false')")
    check "$id advisory has reasoning" "$has_reasoning"

    has_confidence=$(echo "$adv" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print('true' if d.get('confidence',0) > 0 else 'false')")
    check "$id advisory has confidence" "$has_confidence"
  else
    FAIL=$((FAIL + 2)); TOTAL=$((TOTAL + 2))
  fi
done

# Portfolio benchmarks
echo "--- portfolio ---"
port=$(curl -sf --max-time 90 $BASE/api/clients/schneider/portfolio 2>/dev/null)
if [ -n "$port" ]; then
  conflicts=$(echo "$port" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']['conflicts']))")
  check "schneider has conflicts" "$([ "$conflicts" -gt 0 ] && echo true || echo false)"

  drift=$(echo "$port" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']['driftBreaches']))")
  check "schneider has drift breaches" "$([ "$drift" -gt 0 ] && echo true || echo false)"
fi

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="
exit $FAIL
