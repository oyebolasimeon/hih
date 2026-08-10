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

# Helper files for the host
cat > "$OUT/.env.example" <<'EOF'
# Set these in cPanel → Setup Node.js App → Environment Variables
# (Do NOT upload .env.local with secrets into a public zip if you share it)

AUTH_URL=https://novaelitehomes.co.uk
AUTH_SECRET=

ADMIN_EMAILS=

MONGODB_URI=

REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
REDIS_USERNAME=default
REDIS_TLS=false

GOOGLE_SMTP_HOST=smtp.gmail.com
GOOGLE_SMTP_PORT=587
GOOGLE_SMTP_SECURE=false
GOOGLE_SMTP_USER=
GOOGLE_SMTP_PASSWORD=
GOOGLE_SMTP_FROM=

AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

TURNSTILE_SECRET_KEY=

# NEXT_PUBLIC_* values are baked in at build time.
# Rebuild locally if you change NEXT_PUBLIC_TURNSTILE_SITE_KEY or NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY.
EOF

cat > "$OUT/README-UPLOAD.txt" <<'EOF'
Nova Elite Homes — cPanel upload pack
=====================================

1) cPanel → Setup Node.js App → your app (Application root: nova)
   - Node.js: 20.x+
   - Mode: Production
   - Startup file: server.js
   - Application URL: novaelitehomes.co.uk

2) In File Manager, open the Application root folder (nova).
   - Enable "Show Hidden Files" (Settings) so .next is visible
   - Delete old app files if replacing (keep nothing conflicting)
   - Upload nova-cpanel.zip and EXTRACT here
     OR upload contents of cpanel-deploy/

3) Environment Variables (Node.js App → ADD VARIABLE / Edit):
   Copy from .env.example — at minimum set:
   AUTH_URL=https://novaelitehomes.co.uk
   AUTH_SECRET=...
   MONGODB_URI=...
   REDIS_* , GOOGLE_SMTP_* , CLOUDINARY_* , ADMIN_EMAILS
   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (if using Google login)
   TURNSTILE_SECRET_KEY

4) Usually you do NOT need "Run NPM Install" (standalone includes deps).
   If the app fails to start missing modules, click Run NPM Install once.

5) Click RESTART

6) Google OAuth: add redirect URI
   https://novaelitehomes.co.uk/api/auth/callback/google

7) Cloudflare Turnstile: allow novaelitehomes.co.uk

If the old static site still shows, rename public_html/index.html → index.html.bak
and ensure the Node app is attached to the domain.
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

SIZE=$(du -h "$ROOT/nova-cpanel.zip" | awk '{print $1}')
echo "✓ Ready: $OUT"
echo "✓ Zip:    $ROOT/nova-cpanel.zip ($SIZE)"
echo "  Upload/extract into Application root (nova)."
echo "  Startup file: server.js"
echo "  IMPORTANT: Enable Show Hidden Files so .next uploads."
