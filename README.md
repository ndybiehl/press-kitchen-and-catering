# Press Kitchen & Catering

Public marketing site for **[Press Kitchen & Catering](https://presskitchenandcatering.com)** — Billings, Montana.

| | |
|---|---|
| **Business** | Press Kitchen & Catering |
| **Email** | [press.catering406@gmail.com](mailto:press.catering406@gmail.com) |
| **Location** | Billings, MT |
| **Stack** | Plain HTML / CSS / minimal JS (zero build step) |
| **Source content** | Migrated from Canva-hosted site |

## Local preview

```bash
cd press-kitchen-and-catering
python3 -m http.server 8080
# open http://localhost:8080/
```

Or open `index.html` directly in a browser.

## What’s in the repo

- `index.html` — single-page site (hero, about, menus, gallery, catering, contact form)
- `css/styles.css` — brand styles (charcoal / cream / gold)
- `images/` — optimized web assets (logo, food, catering, menus)
- `video/hero.mp4` — optional Canva hero clip (not currently used in the page)
- `robots.txt`, `sitemap.xml` — basic SEO

Large raw Canva exports live under `images/canva-raw/` locally and are **gitignored**.

## Contact form

Quote form posts via [FormSubmit](https://formsubmit.co) → `press.catering406@gmail.com`.

**First live submit** must be confirmed from that inbox (FormSubmit activation email).

## Deploy (DigitalOcean App Platform)

Spec: [`.do/app.yaml`](.do/app.yaml)

### UI (recommended)

1. [cloud.digitalocean.com](https://cloud.digitalocean.com) → **Apps** → **Create App**
2. **GitHub** → authorize if needed → repo **`ndybiehl/press-kitchen-and-catering`**, branch **`main`**
3. Resource type: **Static Site** (not Web Service / Node)
4. Source directory: `/` · Build command: *(leave empty)* · Output directory: `/` (or blank)
5. Plan: **Basic** static is fine · region **NYC** (or closest)
6. **Create Resources** → wait for deploy → open the `*.ondigitalocean.app` URL
7. Later: **Settings → Domains** → add `presskitchenandcatering.com` (+ `www` if you want)  
   Point DNS at DO only when ready to leave Canva.

### CLI

```bash
doctl apps create --spec .do/app.yaml
# or update an existing app:
# doctl apps update <app-id> --spec .do/app.yaml
```

Push to `main` redeploys automatically (`deploy_on_push: true`).

### Other hosts

- **GitHub Pages** — already enabled: https://ndybiehl.github.io/press-kitchen-and-catering/
- **Cloudflare Pages** — connect the same repo, root output

Domain is still on Canva until DNS cutover.

## Content notes

- Chef / owners: James Schendel & Muriah  
- Tagline: *Flat out delicious* · *Press · Smash · Crave · Repeat*  
- Menus embedded as images (main, breakfast, tidbits, kids) scraped from the Canva site  

## License / ownership

Site content and photography belong to Press Kitchen & Catering. Repo is for development and deployment of their marketing site.
