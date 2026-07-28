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

## Deploy options

Any static host works:

1. **GitHub Pages** — Settings → Pages → deploy from `main` / root  
2. **DigitalOcean App Platform** — Static Site, output dir `/`  
3. **Cloudflare Pages** — connect this repo  

Point `presskitchenandcatering.com` DNS at the new host when ready (currently Cloudflare → Canva).

## Content notes

- Chef / owners: James Schendel & Muriah  
- Tagline: *Flat out delicious* · *Press · Smash · Crave · Repeat*  
- Menus embedded as images (main, breakfast, tidbits, kids) scraped from the Canva site  

## License / ownership

Site content and photography belong to Press Kitchen & Catering. Repo is for development and deployment of their marketing site.
