#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/cpanel-deploy"

echo "→ Building Next.js (standalone)…"
cd "$ROOT"
npm run build

echo "→ Assembling cpanel-deploy/…"
rm -rf "$OUT"
mkdir -p "$OUT"

# Standalone server (includes minimal node_modules)
cp -a "$ROOT/.next/standalone/." "$OUT/"

# Static assets Next expects next to the server
mkdir -p "$OUT/.next"
cp -a "$ROOT/.next/static" "$OUT/.next/static"
cp -a "$ROOT/public" "$OUT/public"

# Optional helper files for the host
cat > "$OUT/.env.example" <<'EOF'
# Set these in cPanel → Setup Node.js App → Environment Variables

TURNSTILE_SECRET_KEY=

# NEXT_PUBLIC_* values are baked in at build time (already in this package).
# Rebuild locally if you change NEXT_PUBLIC_TURNSTILE_SITE_KEY or NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY.
EOF

cat > "$OUT/README-UPLOAD.txt" <<'EOF'
Nova Elite Homes — cPanel upload pack
=====================================

1) In cPanel open "Setup Node.js App"
2) Create/edit application:
   - Node.js version: 20.x or newer
   - Application mode: Production
   - Application root: nova (or your chosen folder)
   - Application URL: your domain (e.g. novaelitehomes.co.uk)
   - Application startup file: server.js
3) Upload/extract this package into the Application root
   (enable Show Hidden Files so .next is included)
4) Click "Run NPM Install" if node_modules/next is missing
5) Environment Variables:
   - TURNSTILE_SECRET_KEY=your_turnstile_secret
6) Restart the app
7) In Cloudflare Turnstile, add your live domain to Allowed Hostnames
8) Test the contact form

If the old website still shows, rename public_html/index.html to index.html.bak
EOF

# Ensure start script is explicit for some cPanel panels
if [[ -f "$OUT/package.json" ]]; then
  node -e "
    const fs=require('fs');
    const p=JSON.parse(fs.readFileSync('$OUT/package.json','utf8'));
    p.scripts={...(p.scripts||{}), start:'node server.js'};
    fs.writeFileSync('$OUT/package.json', JSON.stringify(p,null,2));
  "
fi

echo "→ Creating nova-cpanel.zip (includes hidden .next folder)…"
rm -f "$ROOT/nova-cpanel.zip"
(cd "$OUT" && zip -r -q "$ROOT/nova-cpanel.zip" . -x "*.DS_Store")

echo "✓ Ready: $OUT"
echo "✓ Zip:    $ROOT/nova-cpanel.zip"
echo "  Upload/extract into Application root (nova)."
echo "  Startup file: server.js"
echo "  IMPORTANT: Ensure .next is present (enable Show Hidden Files in File Manager)."
