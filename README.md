# Press Kitchen & Catering

Public marketing site + **food truck / trailer schedule admin** for **[Press Kitchen & Catering](https://presskitchenandcatering.com)** — Billings, Montana.

| | |
|---|---|
| **Business** | Press Kitchen & Catering |
| **Email** | [press.catering406@gmail.com](mailto:press.catering406@gmail.com) |
| **Location** | Billings, MT |
| **Stack** | Node (Express) + static HTML/CSS |
| **Public schedule** | `/#find-us` · API `GET /api/locations` |
| **Admin (Muriah)** | `/admin` — calendar + address/GPS for truck stops |
| **Hosting** | DigitalOcean App Platform (Node web service) |

## Local development

```bash
cd press-kitchen-and-catering
npm install
# optional: ADMIN_PASSWORD=secret npm run dev
npm run dev
# Site:   http://localhost:3000/
# Admin:  http://localhost:3000/admin
```

Default first-boot password (only if no hash/env password):

`ChangeMe-Press2026!`

**Set a real password before Muriah uses production.**

```bash
npm run hash-password -- 'her-secure-password'
# put the hash in ADMIN_PASSWORD_HASH (DO app env secret)
```

Admin email default: `press.catering406@gmail.com` (override with `ADMIN_EMAIL`).

## Schedule feature (Muriah)

1. Open **`/admin`** and sign in.
2. Click a day on the calendar (or enter a date).
3. Add:
   - **Title** (e.g. “Library plaza”)
   - **Street address** and/or **lat/lng**
   - Optional: paste a **Google Maps link** (GPS is extracted when possible)
   - Start/end times, notes, published toggle
4. Save — published stops show on the homepage under **Where we’ll be**, with Google/Apple Maps directions.

Data file: `data/locations.json` (created automatically).

## Contact form

Quote form posts via [FormSubmit](https://formsubmit.co) → `press.catering406@gmail.com`.

**First live submit** must be confirmed from that inbox (FormSubmit activation email).

## Deploy (DigitalOcean App Platform)

**Important:** this is a **Web Service (Node)**, not a Static Site — needed for `/admin` and the schedule API.

Spec: [`.do/app.yaml`](.do/app.yaml)

### UI

1. [cloud.digitalocean.com](https://cloud.digitalocean.com) → **Apps** → **Create App**
2. **GitHub** → **`ndybiehl/press-kitchen-and-catering`**, branch **`main`**
3. Resource type: **Web Service**
4. Build: `npm install` (default) · Run: `npm start` · HTTP port: **`3000`**
5. Health check: `/healthz`
6. App-level env secrets:
   - `SESSION_SECRET` — long random string  
   - `ADMIN_PASSWORD_HASH` — from `npm run hash-password`  
   - `ADMIN_EMAIL=press.catering406@gmail.com` (or Muriah’s preferred login email)  
   - `NODE_ENV=production`  
   - `PUBLIC_SITE_URL=https://presskitchenandcatering.com`
7. Create → open `*.ondigitalocean.app` → test `/admin` and `/#find-us`
8. Domains later when leaving Canva

### CLI

```bash
doctl apps create --spec .do/app.yaml
```

### Storage note

Stops are saved in `data/locations.json` on the running instance. Redeploys can replace the filesystem; for production durability you can:

- Re-enter a few stops after rare redeploys, or  
- Later move storage to DO Spaces / a small DB  

Committed `data/locations.json` is the seed (starts empty).

## Design notes

This site is a **faithful recreation of Muriah’s Canva design**, not a rebrand:

- Black canvas, white display type, yellow accent energy  
- Her PRESS logo, menu boards, food photography, picnic / catering photos  
- Her copy (About, catering, *Flat out delicious*, *Press • Smash • Crave • Repeat*, *Follow The Flavor*)  
- Roman numeral mark **I · IX · MMXXV**  

We only added practical pieces Canva can’t do well: **food truck schedule admin**, quote form, and hostable HTML.

## Content notes

- Chef / owners: James Schendel & Muriah  
- Tagline: *Flat out delicious* · *Press · Smash · Crave · Repeat*  
- Menus embedded as **her designed boards** (main, breakfast, tidbits, kids)

## License / ownership

Site content and photography belong to Press Kitchen & Catering.
