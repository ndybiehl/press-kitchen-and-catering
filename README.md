# Press Kitchen & Catering

Self-hosted marketing site for **Press Kitchen & Catering** (Billings, MT).

**Not a Canva embed/mirror.** We pulled Muriah’s **components** (logo, menu boards, food photos, catering photos, copy, brand colors) from the public Canva site and rebuilt them as normal HTML/CSS we control and host.

| | |
|---|---|
| **Source of design** | Public site presskitchenandcatering.com (assets + copy) |
| **What we host** | `public/` — our pages + her media |
| **Email** | press.catering406@gmail.com |
| **Truck schedule admin** | `/admin` when running Node (`npm start`) |
| **DO** | Static Site → output dir `public` |

## Local

```bash
npm install
npm run dev          # Node: site + /admin + /api/locations
# or static only:
npx serve public     # or: python3 -m http.server -d public 8080
```

## DigitalOcean (Static Site)

- **Build command:** `npm run build`
- **Output directory:** `public`
- Redeploy after push to `main`

## Content map (from her Canva site)

- Logo, picnic photo of James & Muriah  
- Menu boards: Main, Breakfast, Tidbits, Kids  
- Food product shots, catering boards  
- Copy: About (Chef James), catering blurb, *Flat out delicious*, *Press • Smash • Crave • Repeat*, *Follow The Flavor*  

Raw Canva scrape kept in `canva-mirror/` for re-exporting assets only (not served).
