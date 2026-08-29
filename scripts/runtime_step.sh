#!/usr/bin/env bash
# Hands a request off to the local counsel-os runtime (spec §4.7), when one
# is running. Called by the plugin skill before it does anything else; a
# non-zero exit means "no runtime, proceed with the skill as usual" and must
# stay silent, so a missing/optional runtime is never visible to the user.
#
#   exit 0  the runtime handled it; its text is already on stdout
#   exit 1  the runtime reported an error; the message is on stderr
#   exit 3  no runtime available (missing deps, no runtime.json, dead
#           server, or anything else that stops us before a step could
#           even start) — always silent: no stdout, no stderr

REQUEST="${1:-}"

command -v curl >/dev/null 2>&1 || exit 3
command -v jq >/dev/null 2>&1 || exit 3

# `runtime.json` may live under an explicit COUNSEL_OS_HOME override (what
# the tests use) or the real default; check both, in that order.
runtime_file=""
if [[ -n "${COUNSEL_OS_HOME:-}" && -f "${COUNSEL_OS_HOME}/runtime.json" ]]; then
  runtime_file="${COUNSEL_OS_HOME}/runtime.json"
elif [[ -f "${HOME}/.counsel-os/runtime.json" ]]; then
  runtime_file="${HOME}/.counsel-os/runtime.json"
fi
[[ -n "$runtime_file" && -r "$runtime_file" ]] || exit 3

port="$(jq -r '.port // empty' "$runtime_file" 2>/dev/null)"
token="$(jq -r '.token // empty' "$runtime_file" 2>/dev/null)"
[[ -n "$port" && -n "$token" ]] || exit 3

base="http://127.0.0.1:${port}"

# A dead/unreachable server (stale runtime.json, crashed process) is exactly
# like no runtime at all.
curl -sf --max-time 1 -H "Authorization: Bearer ${token}" "${base}/health" >/dev/null 2>&1 || exit 3

cache_file="${TMPDIR:-/tmp}/counsel-os-thread-${CLAUDE_SESSION_ID:-$PPID}"

create_thread() {
  curl -sf --max-time 5 -X POST -H "Authorization: Bearer ${token}" "${base}/threads" 2>/dev/null \
    | jq -r '.id // empty' 2>/dev/null
}

thread_id=""
[[ -f "$cache_file" ]] && thread_id="$(cat "$cache_file" 2>/dev/null)"

# A cached thread the runtime no longer knows about (restarted server, vault
# moved) gets replaced rather than failed on.
if [[ -n "$thread_id" ]]; then
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 -H "Authorization: Bearer ${token}" "${base}/threads/${thread_id}" 2>/dev/null)"
  [[ "$status" == "200" ]] || thread_id=""
fi

if [[ -z "$thread_id" ]]; then
  thread_id="$(create_thread)"
  [[ -n "$thread_id" ]] || exit 3
  printf '%s' "$thread_id" > "$cache_file" 2>/dev/null || exit 3
fi

step_body="$(jq -n --arg msg "$REQUEST" '{message: $msg}')"

current_event=""
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
          printf '%s' "$(jq -rn --unbuffered --argjson d "$payload" '$d.text')"
          ;;
        tool_call)
          name="$(jq -rn --unbuffered --argjson d "$payload" '$d.name')"
          echo "→ tool ${name}" >&2
          ;;
        error)
          message="$(jq -rn --unbuffered --argjson d "$payload" '$d.message')"
          echo "⚠ ${message}" >&2
          saw_terminal=1
          exit_code=1
          break
          ;;
        done)
          saw_terminal=1
          exit_code=0
          break
          ;;
      esac
      ;;
  esac
done < <(curl -sN --max-time 120 -X POST \
  -H "Authorization: Bearer ${token}" \
  -H "Content-Type: application/json" \
  --data-binary "$step_body" \
  "${base}/threads/${thread_id}/steps")

# The stream closed without a terminal event (transport failure, server
# killed mid-step) — not a runtime we can trust the answer from.
[[ "$saw_terminal" == "1" ]] || exit 3

exit "$exit_code"
