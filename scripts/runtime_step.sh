#!/usr/bin/env bash
# Hands a request off to the local counsel-os runtime (spec §4.7), when one
# is running. Called by the plugin skill before it does anything else; a
# non-zero exit means "no runtime, proceed with the skill as usual".
#
#   exit 0  the runtime handled it; its text is already on stdout
#   exit 1  the runtime reported an `error` event, OR the stream ended
#           without a terminal event AFTER some text had already reached
#           stdout — the message is on stderr ("⚠ ...")
#   exit 3  no runtime available, and NOTHING has been printed yet (missing
#           deps, no runtime.json, dead server, a step that ended before
#           its first byte of text) — always silent: no stdout, no stderr
#
# The silent exit-3 contract holds ONLY until the first byte of text has
# gone to stdout. Once text has been relayed to the user, a failure can no
# longer be swallowed silently — the caller already has partial output on
# screen — so from that point on a broken stream is reported (exit 1 + a
# stderr warning) instead.
#
# A malformed `data:` line (bad JSON) is skipped, not fatal: the loop keeps
# reading for the terminal event that follows it.
#
# The step POST carries NO `--max-time`. A counsel step is a whole model turn
# and can legitimately run for many minutes (a long document review, a slow
# local model); a wall-clock deadline on it would cut a healthy stream off
# mid-answer and report it as a broken one. Liveness is covered where it is
# cheap instead: `--connect-timeout` bounds reaching a dead server on every
# request, and the `/health` probe above still has a 1 s deadline, so an
# unreachable or wedged runtime is caught before any step is sent.

set -euo pipefail

REQUEST="${1:-}"

command -v curl >/dev/null 2>&1 || exit 3
command -v jq >/dev/null 2>&1 || exit 3

# `runtime.json` may live under an explicit COUNSEL_OS_HOME override (what
# the tests use) or the real default; check both, in that order.
runtime_file=""
if [[ -n "${COUNSEL_OS_HOME:-}" && -f "${COUNSEL_OS_HOME}/runtime.json" ]]; then
  runtime_file="${COUNSEL_OS_HOME}/runtime.json"
elif [[ -f "${HOME:-}/.counsel-os/runtime.json" ]]; then
  runtime_file="${HOME:-}/.counsel-os/runtime.json"
fi
[[ -n "$runtime_file" && -r "$runtime_file" ]] || exit 3

port="$(jq -r '.port // empty' "$runtime_file" 2>/dev/null)" || true
token="$(jq -r '.token // empty' "$runtime_file" 2>/dev/null)" || true
[[ -n "${port:-}" && -n "${token:-}" ]] || exit 3

base="http://127.0.0.1:${port}"

# Every request authenticates through a curl config file handed in via
# process substitution (`header = "..."`), never `-H` on the command line,
# so the bearer token never lands in this process's argv — and so never in
# `ps`. `printf` here is the bash builtin, not an external binary, so the
# token never appears as an exec'd process's argv either.
curl_auth() {
  curl -K <(printf 'header = "Authorization: Bearer %s"\n' "$token") "$@"
}

# A dead/unreachable server (stale runtime.json, crashed process) is exactly
# like no runtime at all.
curl_auth -sf --max-time 1 "${base}/health" >/dev/null 2>&1 || exit 3

cache_file="${TMPDIR:-/tmp}/counsel-os-thread-${CLAUDE_SESSION_ID:-$PPID}"

create_thread() {
  curl_auth -sf --max-time 5 -X POST "${base}/threads" 2>/dev/null \
    | jq -r '.id // empty' 2>/dev/null
}

thread_id=""
if [[ -f "$cache_file" ]]; then
  thread_id="$(cat "$cache_file" 2>/dev/null)" || true
fi

# A cached thread the runtime no longer knows about (restarted server, vault
# moved) gets replaced rather than failed on.
if [[ -n "$thread_id" ]]; then
  status="$(curl_auth -s -o /dev/null -w '%{http_code}' --max-time 3 "${base}/threads/${thread_id}" 2>/dev/null)" || true
  [[ "${status:-}" == "200" ]] || thread_id=""
fi

if [[ -z "$thread_id" ]]; then
  thread_id="$(create_thread)" || true
  [[ -n "$thread_id" ]] || exit 3
  printf '%s' "$thread_id" > "$cache_file" 2>/dev/null || exit 3
fi

step_body="$(jq -n --arg msg "$REQUEST" '{message: $msg}')" || exit 3

current_event=""
printed=0
saw_terminal=0
exit_code=3

while IFS= read -r line; do
  case "$line" in
    "event: "*)
      current_event="${line#event: }"
      ;;
    "data: "*)
      payload="${line#data: }"
      case "$current_event" in
        text)
          # Written directly (no `$(...)`) so every fragment reaches stdout
          # byte-exact, with no trailing newline appended.
          if jq -j -n --argjson d "$payload" '$d.text' 2>/dev/null; then
            printed=1
          fi
          ;;
        tool_call)
          if name="$(jq -rn --argjson d "$payload" '$d.name' 2>/dev/null)"; then
            echo "→ tool ${name}" >&2
          fi
          ;;
        proposal)
          if formatted="$(jq -rn --argjson d "$payload" '"\($d.path) (\($d.id))"' 2>/dev/null)"; then
            echo "→ proposal ${formatted}" >&2
          fi
          ;;
        error)
          if message="$(jq -rn --argjson d "$payload" '$d.message' 2>/dev/null)"; then
            echo "⚠ ${message}" >&2
            saw_terminal=1
            exit_code=1
            break
          fi
          ;;
        done)
          saw_terminal=1
          exit_code=0
          break
          ;;
      esac
      ;;
  esac
done < <(curl_auth -sN --connect-timeout 2 -X POST \
  -H "Content-Type: application/json" \
  --data-binary "$step_body" \
  "${base}/threads/${thread_id}/steps")

if [[ "$saw_terminal" != "1" ]]; then
  if [[ "$printed" == "1" ]]; then
    echo "⚠ runtime stream ended unexpectedly" >&2
    exit 1
  fi
  exit 3
fi

exit "$exit_code"
