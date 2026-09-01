#!/bin/zsh
# Dev-only: build the UI, start a read-only spare serve on the founder's vault
# with a throwaway home, and screenshot Home / a thread / the reader in light
# and dark for one theme direction. Usage: theme-shots.sh <label> <port>
set -e
LABEL="$1"; PORT="$2"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/superpowers/specs/img-theme"; mkdir -p "$OUT"
HOME_DIR="$(mktemp -d)"
B="$HOME/.claude/skills/gstack/browse/dist/browse"
VAULT="/Users/jackwang/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian/Counsel OS"
THREAD='#/chat?thread=df861378-3e0f-4f0b-8929-5963e584a276'
READER='#/vault?path=matters%2F2026-06-sinai-lerner-k12-partnership.md'

cd "$ROOT" && bun run ui:build >/dev/null 2>&1
pkill -f "serve --port $PORT" 2>/dev/null || true
COUNSEL_OS_HOME="$HOME_DIR" nohup bun runtime/src/cli.ts serve --port "$PORT" --vault "$VAULT" --dist runtime/ui/dist > "$HOME_DIR/serve.log" 2>&1 &
for i in {1..30}; do grep -q 'token=' "$HOME_DIR/serve.log" 2>/dev/null && break; sleep 0.5; done
TOKEN=$(grep -o 'token=[a-f0-9]*' "$HOME_DIR/serve.log" | tail -1)

shot() { # $1 mode
  $B js "location.hash='#/'" >/dev/null; sleep 1.2; $B screenshot "$OUT/$LABEL-home-$1.png" >/dev/null
  $B js "location.hash='$THREAD'" >/dev/null; sleep 1.8; $B screenshot "$OUT/$LABEL-chat-$1.png" >/dev/null
  $B js "location.hash='$READER'" >/dev/null; sleep 1.8; $B screenshot "$OUT/$LABEL-reader-$1.png" >/dev/null
}

$B viewport 1440x900 >/dev/null
$B goto "http://127.0.0.1:$PORT/#$TOKEN" >/dev/null 2>&1; sleep 2
shot light
# Dark: copy the `prefers-color-scheme: dark` rules into an unconditional
# <style>, so the headless browser (which reports light) renders the dark
# tokens exactly as the sheet defines them. Screenshot trick only.
$B js "(()=>{for(const s of document.styleSheets){for(const r of s.cssRules){if(r.media&&/dark/.test(r.media.mediaText)){const st=document.createElement('style');st.textContent=[...r.cssRules].map(x=>x.cssText).join('\n');document.head.appendChild(st);return 'dark';}}}return 'none'})()" | tail -1
sleep 0.5
shot dark
pkill -f "serve --port $PORT" 2>/dev/null || true
rm -rf "$HOME_DIR"
ls "$OUT" | grep "^$LABEL-"
