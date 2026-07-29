# Press Kitchen & Catering

**Self-hosted copy of Muriah’s exact Canva website**, plus optional schedule admin.

| | |
|---|---|
| **Live Canva (until cutover)** | https://presskitchenandcatering.com/ |
| **Source of public UI** | `canva-mirror/` — full export of her Canva site (HTML + `_assets/`) |
| **Email** | press.catering406@gmail.com |
| **Admin (truck schedule)** | `/admin` |
| **Stack** | Node (Express) serves the Canva mirror + admin API |

This is **not a redesign**. The homepage is the same Canva-built experience, files pulled from the live site so hosting can leave Canva without changing how it looks.

## Local preview

```bash
cd press-kitchen-and-catering
npm install
npm run dev
# Exact Canva site: http://localhost:3000/
# Schedule admin:   http://localhost:3000/admin
```

Default admin password (until you set `ADMIN_PASSWORD_HASH`):

`ChangeMe-Press2026!`

```bash
npm run hash-password -- 'her-secure-password'
```

## Refresh the Canva mirror

If Muriah updates the Canva design:

```bash
python3 scripts/refresh-canva-mirror.py
git add canva-mirror
git commit -m "Refresh Canva mirror from live site"
git push
```

## Project layout

```
canva-mirror/           ← PUBLIC SITE (exact Canva export)
  index.html
  _assets/…             media, fonts, JS, CSS, video
server/                 admin + API + static server
data/locations.json     truck/trailer stops (admin)
archive-custom-rebuild/ earlier custom HTML attempt (not served)
scripts/refresh-canva-mirror.py
```

## Deploy (DigitalOcean — Web Service)

Must be **Node Web Service** (not Static Site) if you want `/admin`.

1. Repo `ndybiehl/press-kitchen-and-catering` · branch `main`
2. Run `npm start` · port `3000` · health `/healthz`
3. Secrets: `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, `ADMIN_EMAIL`, `NODE_ENV=production`

Spec: `.do/app.yaml`

For **looks-only** hosting you could also point any static host at `canva-mirror/` alone (no admin).

## Schedule admin (later polish)

`/admin` lets Muriah add truck/trailer dates, address, and GPS.  
Public API: `GET /api/locations` — not shown on the Canva homepage yet (we can wire a section once the exact site is live and approved).

## License / ownership

Design, photography, and copy belong to Press Kitchen & Catering (Muriah / James).
