
## Required environment variables

Set these in Netlify: **Site configuration → Environment variables**.

| Variable | Purpose |
|---|---|
| `ADMIN_USERNAME` | Your admin login username |
| `ADMIN_PASSWORD` | Your admin login password (plain text env var — not stored in Blobs, only ever compared server-side) |
| `SESSION_SECRET` | A long random string used to sign session cookies. Generate one with `openssl rand -hex 32`. |

Without `SESSION_SECRET` set, login will fail with a server error — the functions will not run without it.

## Adding, editing and removing apps

Once deployed, sign in as admin and use the "Add an app" / edit (pencil) /
delete (trash) controls on the hub page — no need to touch code. The first
time the site runs, it seeds itself with your 4 current apps (Tool Tracker,
As-Built Viewer, Delivery, Prefab Catalog) at the statuses you specified.

## Creating viewer accounts

As admin, use the "Viewer accounts" panel to create a username/password for
anyone who should see Beta apps but shouldn't be able to edit anything.
Passwords must be at least 8 characters and are hashed (salted scrypt)
before being stored.

## Deploy

1. Push this repo to GitHub (see the file layout above — `index.html`,
   `style.css`, `app.js` go inside a `site/` folder).
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Build command: leave blank (already set via `netlify.toml`). Publish
   directory: `site` (already set via `netlify.toml`).
4. Set the three environment variables above.
5. Deploy.

Netlify installs `@netlify/blobs` from `package.json` automatically as
part of the deploy — no manual `npm install` step needed on your end.

## Notes

- **Logo:** the header currently uses a text wordmark ("DINTO" / "ELECTRIC").
  Swap in the real logo by replacing the `.wordmark` block in `index.html`
  with an `<img>`/inline SVG.
- **Iframe previews:** if any linked app sends `X-Frame-Options: DENY` or a
  restrictive `frame-ancestors` CSP, its preview tile will render blank
  (the card link itself still works). Allow framing from this hub's origin
  in that app's own `netlify.toml`/`_headers` if you want its preview to show.
- **Sessions** last 7 days and are stored client-side as a signed cookie —
  changing `SESSION_SECRET` later will log everyone out.
