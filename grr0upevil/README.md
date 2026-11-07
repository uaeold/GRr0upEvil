# GRr0upEvil

## Run it
1. `npm install` (Node 22 or newer)
2. Copy `.env.example` to `.env` and fill in at least `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
3. `npm start`, then open your admin path (default `/admin`).

Docker: `docker build -t grr0upevil .` and mount persistent volumes on `/app/data`, `/app/uploads`, `/app/backups`.

## What changed in 1.1
**Download flow**
- Before every download a window appears with the notice *"By using this tool you take responsibility for any illegal use, and you agree to the Terms of Use and Disclaimer"* (Arabic and English) and a checkbox that must be ticked. The server also refuses to issue a download link unless the acceptance is sent, so it can't be skipped by calling the API directly.
- A full **Terms & Disclaimer** page (footer link). Edit the text from the admin panel (Site settings), or leave it empty to use the built-in text. It is a generic template, not legal advice. Have it checked against the laws that apply to you.
- Optional Cloudflare Turnstile captcha in the same window (`TURNSTILE_*` in `.env`).
- One-time download links (10 minutes), as before.

**Premium that actually means something**
- Premium tools are downloadable only by logged-in admins or by members of your Discord server who have the premium role (`DISCORD_*` in `.env`). Their file password is no longer public either.
- Without the Discord settings, premium tools are locked for everyone except you when you're logged in as admin.

**Admin**
- Secret admin path (`ADMIN_PATH`), optional 2FA with any authenticator app (`npm run totp` prints the secret), failed logins are logged, and only failed attempts count toward the 15-minute lockout.
- Edit a tool (name, description, type, password, image) and replace its file with a new version. A changelog line is added automatically.
- Discord webhook notification for new tools, file updates and changelog notes (`DISCORD_WEBHOOK_URL`).

**Site**
- SHA-256 checksum on every tool card, plus a VirusTotal lookup link. Checksums for older tools are filled in on first start.
- A page per tool (`/t/<id>`) with a preview image/title for Discord, X, etc., and a "copy link" button on each card.
- Arabic / English with right-to-left layout (button in the header, remembered per browser).
- Visits count once per visitor per day and ignore bots.
- Search is debounced and the text effect plays once per card. The rain animation pauses in hidden tabs and is lighter on phones. Sound is off by default (speaker button). Windows close with Esc and keep keyboard focus inside.

**Security and stability**
- Content-Security-Policy, HSTS (over HTTPS), cross-origin request blocking on every write request, session fixation protection, no `x-powered-by`.
- Links (team members, Discord) must be `http(s)://`. Uploaded images are checked by their real file signature and are served with the correct content type.
- Failed or invalid uploads no longer leave orphan files on disk.
- Settings fields can be cleared.
- Data files are written atomically (a crash can't leave a half-written file), sessions are stored on disk and survive restarts, and the rate limiter cleans itself up.

## Backups
`npm run backup` copies `data/` and **hard-links** `uploads/` into `backups/<timestamp>/`. Uploaded files are never modified, so the snapshots cost almost no extra disk space. The newest `BACKUP_KEEP` (default 7) are kept. Set `BACKUP_INTERVAL_HOURS` to run it automatically.
**This only protects against mistakes, not against losing the disk.** Also copy `backups/` (or `data/` + `uploads/`) to another machine or to cloud storage (for example `rclone`).

## Hosting tips
- Put the site behind Cloudflare (free): HTTPS, CDN, DDoS protection, and Turnstile for the captcha.
- Free hosting tiers often wipe the disk on redeploy: attach persistent volumes to `data/`, `uploads/` and `backups/`.
- Very large files will use your server's bandwidth. If that becomes a problem, the next step is moving files to Cloudflare R2 / S3 with signed links (not included).

## Discord setup (premium roles)
1. discord.com/developers → New Application → OAuth2 → add redirect `https://your-domain/auth/discord/callback`.
2. Copy Client ID and Client Secret into `.env`, plus your server ID and the premium role ID (enable Developer Mode in Discord to copy IDs).
3. Visitors sign in from the header. Roles are checked at login and the session lasts 6 hours.


## Netlify deployment
See [NETLIFY-DEPLOY.md](NETLIFY-DEPLOY.md). This setup uses Netlify for the frontend and a persistent Node backend for Express data and uploads.
