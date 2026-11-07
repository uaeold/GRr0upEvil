# Group Evil — Netlify deployment

## Architecture
The app is Express and stores tools, images, JSON data and sessions on disk. Netlify Functions do not provide a persistent writable disk between invocations. Running the original server directly as a Netlify Function would risk losing data and breaking uploads/downloads.

This prepared setup uses Netlify for the public frontend and URL routing, with a persistent Node backend for Express, sessions, uploads and data. The included Netlify Function proxies dynamic routes to that backend.

## 1. Deploy the backend
1. Push this project to a private Git repository. Do not commit `.env`.
2. Create a Render Web Service from the repository (or use `render.yaml`).
3. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_PATH` in Render. For the included Netlify route, use `admin` as the path; if you choose a different private path, add a matching rewrite in `netlify.toml`.
4. Set `SESSION_SECRET` to a long random value.
5. The included blueprint mounts a persistent disk at `/var/data` and sets `DATA_DIR` and `UPLOAD_DIR` there, so uploaded files, JSON data and sessions survive backend restarts.
6. Deploy and copy the backend URL, e.g. `https://your-backend.onrender.com`.

## 2. Deploy the Netlify frontend
1. Import the same repository into Netlify.
2. Publish directory: `public`. Leave build command empty.
3. In Netlify environment variables, add `BACKEND_URL` with the backend URL and no trailing slash.
4. Deploy. `netlify.toml` routes API, admin, OAuth, thumbnails, tool pages and downloads through the proxy function.

## 3. Backend environment
Set `PUBLIC_URL` to the Netlify public domain. If Discord login is enabled, set `DISCORD_REDIRECT_URI` to `https://YOUR-NETLIFY-DOMAIN/auth/discord/callback`. Configure Turnstile for the Netlify domain if enabled.

## 4. Security
The uploaded archive included a populated `.env`; it has been removed from this package and replaced by `.env.example`. Rotate the admin password, session secret, Discord client secret, webhook URL and Turnstile secret before deployment. Do not reuse credentials from the uploaded archive.

## 5. Smoke test
- Open the public home page and confirm styles/images load.
- Open the configured admin path and sign in.
- Add a small test tool and image.
- Refresh the site and confirm the tool remains.
- Download it and confirm the download counter increments.
- Restart/redeploy the backend and verify tools and images remain.
- Test Discord login if configured.

## Netlify-only note
A true Netlify-only deployment requires migrating the JSON database, sessions and uploads to managed persistent services such as Supabase and object storage. This hybrid setup preserves the current Express features and persistent storage.
