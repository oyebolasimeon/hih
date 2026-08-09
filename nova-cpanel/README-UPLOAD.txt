Nova Elite Homes — cPanel upload pack
=====================================

1) In cPanel open "Setup Node.js App"
2) Create application:
   - Node.js version: 20.x or newer
   - Application mode: Production
   - Application root: folder where you upload these files (e.g. nova-elite)
   - Application URL: your domain / subdomain (e.g. novaelitehomes.co.uk)
   - Application startup file: server.js
3) Upload EVERYTHING inside this cpanel-deploy folder into the Application root
4) Add Environment Variables in the Node.js App UI:
   - WEB3FORMS_ACCESS_KEY=your_key
   - TURNSTILE_SECRET_KEY=your_secret
5) Click "Restart" / "Run NPM Install" is NOT required (dependencies are already bundled)
6) In Cloudflare Turnstile, add your live domain to Allowed Hostnames
7) Open the site and test the contact form

Routing: passenger/Node proxies all paths to Next.js, so / and hash links (#contact) work.
If the domain still shows old static HTML, remove leftover index.html from public_html
or point the domain document root to this Node app (as set in Application URL).
