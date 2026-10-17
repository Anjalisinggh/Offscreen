#!/usr/bin/env bash
# Sets the site's Worker routes back to "fail open" (past the free plan's daily request limit,
# Cloudflare skips the Worker and the API server answers). `wrangler deploy` resets them to fail
# closed, so run this after every deploy:
#   npx wrangler deploy -c server/wrangler.deploy.jsonc && bash server/fail-open.sh
# Uses wrangler's own login (run any wrangler command first if it has expired).
set -euo pipefail
ZONE=e707fe47a5b1181d25c5f2f6d9c71651 # offscreen.wtf
for f in "${APPDATA:-}/xdg.config/.wrangler/config/default.toml" "$HOME/.config/.wrangler/config/default.toml" "$HOME/Library/Preferences/.wrangler/config/default.toml" "$HOME/.wrangler/config/default.toml"; do
  [ -f "$f" ] && TOKEN=$(sed -n 's/^oauth_token = "\(.*\)"/\1/p' "$f") && break
done
[ -n "${TOKEN:-}" ] || { echo "wrangler is not logged in (npx wrangler login)"; exit 1; }
api() { curl -s -X "$1" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" ${3:+--data "$3"} "https://api.cloudflare.com/client/v4/zones/$ZONE/workers/routes$2"; }

api GET "" | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    for (const r of JSON.parse(s).result) if (r.script) console.log(r.id, r.pattern, r.script);
  });' | while read -r id pattern script; do
  api PUT "/$id" "{\"pattern\":\"$pattern\",\"script\":\"$script\",\"request_limit_fail_open\":true}" \
    | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{const r=JSON.parse(s);console.log(r.success?"fail open:":"FAILED:",r.result?.pattern??JSON.stringify(r.errors))})'
done
