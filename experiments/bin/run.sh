#!/usr/bin/env bash
# One prompt of one experiment: generate six one-shot candidates, render each.
#   experiments/bin/run.sh 001-oneshot-sonnet-5 ink "ink dropping into water, ..."
#   MODEL=claude-opus-5 experiments/bin/run.sh 002-oneshot-opus-5 ink "..."
set -euo pipefail

EXP="$1"; SLUG="$2"; PROMPT="$3"
MODEL="${MODEL:-claude-sonnet-5}"
BIN="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$BIN/../.." && pwd)"
OUT="$REPO/experiments/$EXP/$SLUG"
mkdir -p "$OUT"

t0=$(date +%s)
echo "[$EXP/$SLUG] generating six candidates with $MODEL"
echo "[$EXP/$SLUG]   prompt: $PROMPT"
echo "[$EXP/$SLUG]   30-90s, no output until it returns..."

echo "Write six shaders for: $PROMPT" | claude -p \
  --output-format json \
  --model "$MODEL" \
  --system-prompt "$(cat "$REPO/prompts/codegen.md")" \
  --json-schema "$(jq -c . "$BIN/schema.json")" \
  --setting-sources "" \
  --strict-mcp-config \
  --disable-slash-commands \
  --no-session-persistence \
  > "$OUT/envelope.json"

GEN=$(( $(date +%s) - t0 ))
echo "[$EXP/$SLUG] generated in ${GEN}s"
jq -r '.modelUsage // {} | to_entries[] | "[cost] \(.key): $\(.value.costUSD // 0) in=\(.value.inputTokens // 0) out=\(.value.outputTokens // 0)"' \
  "$OUT/envelope.json" 2>/dev/null || true

jq -r '.structured_output // (.result|fromjson)' "$OUT/envelope.json" > "$OUT/cands.json"
N=$(jq '.candidates|length' "$OUT/cands.json")
echo "[$EXP/$SLUG] $N candidates:"
jq -r '.candidates[].strategy' "$OUT/cands.json" | nl -w4 -s'  '
echo

for i in $(seq 0 $((N-1))); do
  STRAT=$(jq -r ".candidates[$i].strategy" "$OUT/cands.json")
  jq -r ".candidates[$i].source" "$OUT/cands.json" > "$OUT/c$i.glsl"
  printf '[%s] render %d/%d  %-28s ' "$SLUG" "$((i+1))" "$N" "$STRAT"
  r0=$(date +%s)
  if ERR=$( cd "$REPO/harness" && node render.js --in "$OUT/c$i.glsl" --out "$OUT/r$i" 2>&1 >/dev/null ); then
    ST=$(jq -r '.status' "$OUT/r$i/result.json" 2>/dev/null || echo "no-result")
  else
    ST="harness-failed"
  fi
  printf '%-14s %ss\n' "$ST" "$(( $(date +%s) - r0 ))"
  [ "$ST" = "harness-failed" ] && echo "         └─ $(printf '%s' "$ERR" | tail -1)"
done

# manifest: one entry per slug, merged in place
MF="$REPO/experiments/$EXP/manifest.json"
COST=$(jq -r '[.modelUsage // {} | to_entries[] | .value.costUSD // 0] | add // 0' "$OUT/envelope.json")
[ -f "$MF" ] || echo '{"id":"","model":"","git":"","runs":{}}' > "$MF"
jq --arg id "$EXP" --arg m "$MODEL" --arg g "$(cd "$REPO" && git rev-parse --short HEAD)" \
   --arg s "$SLUG" --arg p "$PROMPT" --arg ts "$(date -u +%FT%TZ)" \
   --argjson cost "$COST" --argjson gen "$GEN" \
   '.id=$id | .model=$m | .git=$g | .runs[$s]={prompt:$p, at:$ts, costUSD:$cost, genSeconds:$gen}' \
   "$MF" > "$MF.tmp" && mv "$MF.tmp" "$MF"

echo
echo "[$EXP/$SLUG] done in $(( $(date +%s) - t0 ))s"
echo "  files:  experiments/$EXP/$SLUG"
echo "  sheet:  experiments/bin/sheet.sh $EXP"
