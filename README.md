# Dinto Technologies — Tech Hub

Internal launcher page for Paul Dinto Electrical's web apps. Lists each app as
a card with a live, scaled-down preview of its home page; hovering opens a
larger interactive preview, clicking opens the app in a new tab.

No backend — the app list is static data in `app.js`.

## Structure

- `index.html` — page markup
- `style.css` — Nocturne design tokens + layout/component styles
- `app.js` — app data, card rendering, hover-preview + scaling logic
- `netlify.toml` — Netlify config (static, no build step)

## Adding or editing an app

Edit the `apps` array at the top of `app.js`:

```js
{
  name: 'App Name',
  url: 'https://example.netlify.app/',
  blurb: 'One-line description',
  status: 'Live', // or 'Beta'
}
```

The card's host label and "Open app" link are derived from `url`
automatically.

## Deploy

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import an existing project** → pick this repo.
3. Build command: none. Publish directory: `.` (already set in
   `netlify.toml`).
4. Deploy.

## Notes

- **Logo:** the header currently uses a text wordmark ("DINTO" / "ELECTRIC").
  Swap in the real logo by replacing the `.wordmark` block in `index.html`
  with an `<img>`/inline SVG.
- **Iframe previews:** if any linked app sends `X-Frame-Options: DENY` or a
  restrictive `frame-ancestors` CSP, its preview tile will render blank
  (the card link itself still works). Allow framing from this hub's origin
  in that app's own `netlify.toml`/`_headers` if you want its preview to show.
