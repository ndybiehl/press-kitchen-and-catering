/**
 * Press Kitchen & Catering
 * - Serves public static site from project root
 * - Public schedule: GET /api/locations
 * - Owner admin at /admin (food truck / trailer stops)
 *
 * Env:
 *   PORT
 *   SESSION_SECRET
 *   ADMIN_EMAIL          (default press.catering406@gmail.com)
 *   ADMIN_PASSWORD_HASH  (bcrypt — npm run hash-password)
 *   ADMIN_PASSWORD       (dev only plain password if hash not set)
 *   PUBLIC_SITE_URL
 *   NODE_ENV
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "locations.json");

const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "press.catering406@gmail.com"
)
  .trim()
  .toLowerCase();

const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const DEFAULT_DEV_PASSWORD = "ChangeMe-Press2026!";

function passwordOk(plain) {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (hash) return bcrypt.compareSync(plain, hash);
  const dev = process.env.ADMIN_PASSWORD?.trim();
  if (dev) return plain === dev;
  return plain === DEFAULT_DEV_PASSWORD;
}

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ updatedAt: null, stops: [] }, null, 2) + "\n",
      "utf8",
    );
  }
}

function readStore() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.stops)) data.stops = [];
    return data;
  } catch {
    return { updatedAt: null, stops: [] };
  }
}

function writeStore(data) {
  ensureDataFile();
  data.updatedAt = new Date().toISOString();
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, DATA_FILE);
}

function normalizeStop(input, existingId) {
  const id = existingId || crypto.randomUUID();
  const date = String(input.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Date is required (YYYY-MM-DD)" };
  }

  let lat =
    input.lat === "" || input.lat == null ? null : Number(input.lat);
  let lng =
    input.lng === "" || input.lng == null ? null : Number(input.lng);
  if (lat != null && Number.isNaN(lat)) lat = null;
  if (lng != null && Number.isNaN(lng)) lng = null;
  if (lat != null && (lat < -90 || lat > 90)) {
    return { error: "Latitude must be between -90 and 90" };
  }
  if (lng != null && (lng < -180 || lng > 180)) {
    return { error: "Longitude must be between -180 and 180" };
  }

  // Optional: pull coords from Google Maps / Apple Maps style URLs
  const mapsUrl = String(input.mapsUrl || "").trim();
  if ((lat == null || lng == null) && mapsUrl) {
    const fromUrl = parseCoordsFromUrl(mapsUrl);
    if (fromUrl) {
      lat = fromUrl.lat;
      lng = fromUrl.lng;
    }
  }

  const title = String(input.title || "").trim();
  const address = String(input.address || "").trim();
  if (!title && !address && lat == null) {
    return { error: "Add a title, address, or GPS coordinates" };
  }

  const startTime = String(input.startTime || "").trim() || null;
  const endTime = String(input.endTime || "").trim() || null;
  if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) {
    return { error: "Start time must be HH:MM" };
  }
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) {
    return { error: "End time must be HH:MM" };
  }

  return {
    stop: {
      id,
      date,
      startTime,
      endTime,
      title: title || "Press stop",
      address: address || null,
      lat,
      lng,
      notes: String(input.notes || "").trim() || null,
      published: input.published === false || input.published === "false" ? false : true,
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function parseCoordsFromUrl(url) {
  // @lat,lng or q=lat,lng or !3dLAT!4dLNG
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) };
  const d3 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (d3) return { lat: Number(d3[1]), lng: Number(d3[2]) };
  const ll = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (ll) return { lat: Number(ll[1]), lng: Number(ll[2]) };
  return null;
}

function sortStops(stops) {
  return [...stops].sort((a, b) => {
    const da = `${a.date}T${a.startTime || "00:00"}`;
    const db = `${b.date}T${b.startTime || "00:00"}`;
    return da.localeCompare(db);
  });
}

function todayISO() {
  // America/Denver for Randy; Billings is Mountain too
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Denver",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "128kb" }));

app.use(
  session({
    name: "press_admin",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days — easier for Muriah
    },
  }),
);

function requireAdmin(req, res, next) {
  if (req.session?.adminEmail === ADMIN_EMAIL) return next();
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "Sign in required" });
  }
  return res.redirect(
    "/admin/login?next=" + encodeURIComponent(req.originalUrl || "/admin"),
  );
}

app.get("/healthz", (_req, res) => {
  res.type("text").send("ok");
});

// ---------- Public API ----------
app.get("/api/locations", (req, res) => {
  const store = readStore();
  const includePast = req.query.all === "1";
  const today = todayISO();
  let stops = store.stops.filter((s) => s.published !== false);
  if (!includePast) {
    stops = stops.filter((s) => s.date >= today);
  }
  stops = sortStops(stops);
  res.set("Cache-Control", "public, max-age=60");
  res.json({
    updatedAt: store.updatedAt,
    timezone: "America/Denver",
    today,
    stops,
  });
});

// ---------- Admin API ----------
app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ email: req.session.adminEmail, loginAt: req.session.loginAt });
});

app.get("/api/admin/locations", requireAdmin, (_req, res) => {
  const store = readStore();
  res.set("Cache-Control", "private, no-store");
  res.json({
    updatedAt: store.updatedAt,
    stops: sortStops(store.stops),
  });
});

app.post("/api/admin/locations", requireAdmin, (req, res) => {
  const result = normalizeStop(req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  const store = readStore();
  store.stops.push(result.stop);
  writeStore(store);
  res.status(201).json({ ok: true, stop: result.stop });
});

app.put("/api/admin/locations/:id", requireAdmin, (req, res) => {
  const store = readStore();
  const idx = store.stops.findIndex((s) => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Stop not found" });
  const prev = store.stops[idx];
  const result = normalizeStop(
    { ...prev, ...req.body, createdAt: prev.createdAt },
    prev.id,
  );
  if (result.error) return res.status(400).json({ error: result.error });
  store.stops[idx] = result.stop;
  writeStore(store);
  res.json({ ok: true, stop: result.stop });
});

app.delete("/api/admin/locations/:id", requireAdmin, (req, res) => {
  const store = readStore();
  const before = store.stops.length;
  store.stops = store.stops.filter((s) => s.id !== req.params.id);
  if (store.stops.length === before) {
    return res.status(404).json({ error: "Stop not found" });
  }
  writeStore(store);
  res.json({ ok: true });
});

// ---------- Admin pages ----------
app.get("/admin/login", (req, res) => {
  if (req.session?.adminEmail === ADMIN_EMAIL) {
    return res.redirect("/admin");
  }
  const err = req.query.error ? String(req.query.error) : "";
  res.type("html").send(loginPage(err));
});

app.post("/admin/login", (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");
  if (email !== ADMIN_EMAIL || !passwordOk(password)) {
    return res.redirect("/admin/login?error=invalid");
  }
  req.session.adminEmail = ADMIN_EMAIL;
  req.session.loginAt = new Date().toISOString();
  const next = String(req.body.next || req.query.next || "/admin");
  const safe = next.startsWith("/admin") ? next : "/admin";
  return res.redirect(safe);
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

app.get("/admin", requireAdmin, (_req, res) => {
  res.type("html").send(adminPage());
});

// Do not expose server source, data store, or package metadata
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p.startsWith("/server") ||
    p.startsWith("/data") ||
    p.startsWith("/node_modules") ||
    p.startsWith("/.do") ||
    p === "/package.json" ||
    p === "/package-lock.json" ||
    p.endsWith(".tmp")
  ) {
    return res.status(404).type("text").send("Not found");
  }
  next();
});

// Static site (after API / admin routes)
app.use(express.static(ROOT, { index: "index.html", extensions: ["html"] }));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.status(404).type("html").send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Not found</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;background:#0d0d0d;color:#f6f1e8;display:grid;place-items:center;min-height:100vh;margin:0}
a{color:#e2b84a}</style></head>
<body><div><h1>Not found</h1><p><a href="/">Back to Press</a></p></div></body></html>`);
});

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`Press Kitchen listening on http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});

// ---------- HTML shells ----------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loginPage(error) {
  const msg =
    error === "invalid"
      ? `<p class="err">Email or password didn’t match. Try again.</p>`
      : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Sign in · Press schedule admin</title>
  <style>
    :root { --ink:#0d0d0d; --gold:#e2b84a; --cream:#f6f1e8; --muted:#a39b8e; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family: system-ui, sans-serif;
      background: radial-gradient(ellipse at 30% 0%, #2a2418, var(--ink) 55%); color: var(--cream); padding: 1.25rem; }
    .card { width: min(100%, 400px); background: rgba(255,255,255,.04); border:1px solid rgba(246,241,232,.12);
      border-radius: 16px; padding: 1.75rem; }
    h1 { font-size: 1.35rem; margin: 0 0 .35rem; }
    p { color: var(--muted); margin: 0 0 1.25rem; font-size: .95rem; line-height: 1.5; }
    label { display:grid; gap:.35rem; font-size:.9rem; font-weight:600; margin-bottom:.85rem; }
    input { width:100%; padding:.75rem .9rem; border-radius:10px; border:1px solid rgba(246,241,232,.15);
      background:#111; color:var(--cream); font: inherit; }
    button { width:100%; margin-top:.5rem; padding:.85rem; border:0; border-radius:999px; font-weight:700;
      background:var(--gold); color:var(--ink); cursor:pointer; font:inherit; }
    .err { color:#f0a0a0; background:rgba(180,50,50,.12); border:1px solid rgba(180,50,50,.3);
      padding:.65rem .8rem; border-radius:10px; margin-bottom:1rem; }
    a { color: var(--gold); }
  </style>
</head>
<body>
  <form class="card" method="post" action="/admin/login">
    <h1>Press schedule</h1>
    <p>Sign in to update food truck &amp; trailer locations for the website.</p>
    ${msg}
    <label>Email
      <input type="email" name="email" required autocomplete="username" value="${escapeHtml(ADMIN_EMAIL)}">
    </label>
    <label>Password
      <input type="password" name="password" required autocomplete="current-password">
    </label>
    <button type="submit">Sign in</button>
    <p style="margin-top:1.25rem;margin-bottom:0;font-size:.85rem"><a href="/">← Back to site</a></p>
  </form>
</body>
</html>`;
}

function adminPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Schedule admin · Press Kitchen</title>
  <style>
    :root {
      --ink:#0d0d0d; --charcoal:#161616; --gold:#e2b84a; --gold-hot:#f0c95a;
      --cream:#f6f1e8; --cream-soft:#ebe4d7; --muted:#a39b8e; --line:rgba(246,241,232,.12);
      --ok:#7dcea0; --err:#f0a0a0;
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background:var(--ink); color:var(--cream); line-height:1.5; }
    header { position:sticky; top:0; z-index:10; background:rgba(13,13,13,.94); border-bottom:1px solid var(--line);
      backdrop-filter: blur(10px); }
    .bar { max-width:1100px; margin:0 auto; padding:.85rem 1.15rem; display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; justify-content:space-between; }
    .brand { font-weight:700; letter-spacing:.02em; }
    .brand span { display:block; font-size:.75rem; font-weight:500; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; }
    .actions { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:.35rem; padding:.6rem 1rem; border-radius:999px;
      border:1px solid var(--line); background:transparent; color:var(--cream); font:inherit; font-weight:600; font-size:.9rem;
      cursor:pointer; text-decoration:none; }
    .btn-gold { background:var(--gold); color:var(--ink); border-color:var(--gold); }
    .btn-gold:hover { background:var(--gold-hot); }
    .btn-danger { border-color:rgba(240,160,160,.4); color:var(--err); }
    main { max-width:1100px; margin:0 auto; padding:1.25rem 1.15rem 3rem; display:grid; gap:1.25rem; }
    @media (min-width:900px) { main { grid-template-columns: 1fr 1.15fr; align-items:start; } }
    .card { background:rgba(255,255,255,.03); border:1px solid var(--line); border-radius:16px; padding:1.15rem; }
    h1 { font-size:1.35rem; margin:0 0 .35rem; }
    h2 { font-size:1.1rem; margin:0 0 .85rem; }
    p.lead { color:var(--muted); margin:0 0 1rem; font-size:.95rem; }
    label { display:grid; gap:.3rem; font-size:.88rem; font-weight:600; margin-bottom:.75rem; color:var(--cream-soft); }
    input, textarea, select { width:100%; padding:.7rem .8rem; border-radius:10px; border:1px solid var(--line);
      background:#111; color:var(--cream); font:inherit; }
    textarea { min-height:72px; resize:vertical; }
    .row { display:grid; gap:.75rem; }
    @media (min-width:520px) { .row.two { grid-template-columns:1fr 1fr; } .row.three { grid-template-columns:1fr 1fr 1fr; } }
    .hint { font-size:.8rem; color:var(--muted); font-weight:500; }
    .status { min-height:1.25rem; font-size:.9rem; margin:.5rem 0; }
    .status.ok { color:var(--ok); }
    .status.err { color:var(--err); }
    .cal-nav { display:flex; align-items:center; justify-content:space-between; gap:.5rem; margin-bottom:.75rem; }
    .cal-nav h2 { margin:0; flex:1; text-align:center; font-size:1.05rem; }
    .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
    .cal-dow { text-align:center; font-size:.7rem; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; padding:.25rem 0; }
    .cal-day { min-height:64px; border:1px solid var(--line); border-radius:10px; padding:4px; background:rgba(0,0,0,.25); cursor:pointer; }
    .cal-day:hover { border-color:rgba(226,184,74,.45); }
    .cal-day.muted { opacity:.4; }
    .cal-day.today { outline:1px solid var(--gold); }
    .cal-day.selected { background:rgba(226,184,74,.12); border-color:var(--gold); }
    .cal-day .n { font-size:.75rem; font-weight:700; color:var(--muted); }
    .cal-day .dot { display:block; margin-top:4px; font-size:.62rem; line-height:1.2; color:var(--gold); overflow:hidden;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
    .list { display:grid; gap:.65rem; }
    .stop { border:1px solid var(--line); border-radius:12px; padding:.85rem; background:rgba(0,0,0,.2); }
    .stop.draft { opacity:.7; }
    .stop-top { display:flex; justify-content:space-between; gap:.5rem; align-items:flex-start; }
    .stop h3 { margin:0; font-size:1rem; }
    .stop .meta { color:var(--muted); font-size:.88rem; margin:.25rem 0; }
    .stop .notes { font-size:.9rem; margin:.35rem 0 0; }
    .stop-actions { display:flex; gap:.35rem; flex-shrink:0; }
    .stop-actions button { padding:.35rem .55rem; font-size:.8rem; border-radius:8px; }
    .empty { color:var(--muted); font-size:.95rem; padding:.5rem 0; }
    .check { display:flex; align-items:center; gap:.5rem; font-weight:600; font-size:.9rem; margin:.5rem 0 1rem; }
    .check input { width:auto; }
    .form-actions { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.25rem; }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div class="brand">Press Kitchen schedule
        <span>Food truck &amp; trailer locations</span>
      </div>
      <div class="actions">
        <a class="btn" href="/" target="_blank" rel="noopener">View site</a>
        <form method="post" action="/admin/logout" style="margin:0">
          <button class="btn" type="submit">Sign out</button>
        </form>
      </div>
    </div>
  </header>

  <main>
    <section class="card">
      <div class="cal-nav">
        <button type="button" class="btn" id="prev-month" aria-label="Previous month">←</button>
        <h2 id="month-label">Month</h2>
        <button type="button" class="btn" id="next-month" aria-label="Next month">→</button>
      </div>
      <div class="cal-grid" id="cal-dows"></div>
      <div class="cal-grid" id="cal-days" style="margin-top:4px"></div>
      <p class="lead" style="margin-top:1rem;margin-bottom:.5rem">Stops for <strong id="selected-date-label">today</strong></p>
      <div class="list" id="day-list"></div>
      <p class="lead" style="margin-top:1.25rem;margin-bottom:.5rem">All upcoming</p>
      <div class="list" id="upcoming-list"></div>
    </section>

    <section class="card">
      <h1 id="form-heading">Add a stop</h1>
      <p class="lead">Pick a date on the calendar (or type it), add the address and/or GPS, and save. Visitors see published stops on the website.</p>
      <div class="status" id="form-status" role="status"></div>
      <form id="stop-form">
        <input type="hidden" id="stop-id" value="">
        <div class="row two">
          <label>Date *
            <input type="date" id="date" required>
          </label>
          <label class="check" style="align-self:end;margin-bottom:.9rem">
            <input type="checkbox" id="published" checked> Published on website
          </label>
        </div>
        <div class="row two">
          <label>Start time
            <input type="time" id="startTime">
          </label>
          <label>End time
            <input type="time" id="endTime">
          </label>
        </div>
        <label>Location name / title
          <input type="text" id="title" placeholder="e.g. Downtown Billings · Library plaza" maxlength="120">
        </label>
        <label>Street address
          <input type="text" id="address" placeholder="123 N 27th St, Billings, MT 59101" maxlength="240" autocomplete="street-address">
          <span class="hint">Shown to guests and used for directions if no GPS.</span>
        </label>
        <div class="row two">
          <label>Latitude
            <input type="text" id="lat" inputmode="decimal" placeholder="45.7833">
          </label>
          <label>Longitude
            <input type="text" id="lng" inputmode="decimal" placeholder="-108.5007">
          </label>
        </div>
        <label>Or paste a Google Maps link
          <input type="url" id="mapsUrl" placeholder="https://maps.google.com/...">
          <span class="hint">We’ll try to pull GPS from the link when you save.</span>
        </label>
        <label>Notes (optional)
          <textarea id="notes" placeholder="Park on the north lot · cash only · etc." maxlength="500"></textarea>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn btn-gold" id="save-btn">Save stop</button>
          <button type="button" class="btn" id="reset-btn">Clear form</button>
          <button type="button" class="btn btn-danger" id="delete-btn" hidden>Delete</button>
        </div>
      </form>
    </section>
  </main>

  <script>
    const state = {
      stops: [],
      viewYear: null,
      viewMonth: null, // 0-11
      selectedDate: null, // YYYY-MM-DD
    };

    const $ = (id) => document.getElementById(id);
    const formStatus = $("form-status");

    function todayLocal() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }

    function fmtDateLabel(iso) {
      if (!iso) return "";
      const [y, m, d] = iso.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }

    function fmtTime(t) {
      if (!t) return "";
      const [h, min] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = ((h + 11) % 12) + 1;
      return h12 + ":" + String(min).padStart(2, "0") + " " + ampm;
    }

    function timeRange(s) {
      if (s.startTime && s.endTime) return fmtTime(s.startTime) + " – " + fmtTime(s.endTime);
      if (s.startTime) return "From " + fmtTime(s.startTime);
      return "Hours TBA";
    }

    function setStatus(msg, kind) {
      formStatus.textContent = msg || "";
      formStatus.className = "status" + (kind ? " " + kind : "");
    }

    async function loadStops() {
      const res = await fetch("/api/admin/locations", { credentials: "same-origin" });
      if (res.status === 401) { location.href = "/admin/login"; return; }
      const data = await res.json();
      state.stops = data.stops || [];
      renderAll();
    }

    function stopsOnDate(iso) {
      return state.stops.filter((s) => s.date === iso);
    }

    function renderCalendar() {
      const y = state.viewYear;
      const m = state.viewMonth;
      const label = new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      $("month-label").textContent = label;

      const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      $("cal-dows").innerHTML = dows.map((d) => '<div class="cal-dow">' + d + "</div>").join("");

      const first = new Date(y, m, 1);
      const startPad = first.getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const prevDays = new Date(y, m, 0).getDate();
      const today = todayLocal();
      const cells = [];

      for (let i = 0; i < startPad; i++) {
        const day = prevDays - startPad + i + 1;
        const pm = m === 0 ? 11 : m - 1;
        const py = m === 0 ? y - 1 : y;
        const iso = py + "-" + String(pm + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        cells.push({ iso, day, muted: true });
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        cells.push({ iso, day, muted: false });
      }
      while (cells.length % 7 !== 0) {
        const day = cells.length - (startPad + daysInMonth) + 1;
        const nm = m === 11 ? 0 : m + 1;
        const ny = m === 11 ? y + 1 : y;
        const iso = ny + "-" + String(nm + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        cells.push({ iso, day, muted: true });
      }

      $("cal-days").innerHTML = cells.map((c) => {
        const on = stopsOnDate(c.iso);
        const cls = ["cal-day"];
        if (c.muted) cls.push("muted");
        if (c.iso === today) cls.push("today");
        if (c.iso === state.selectedDate) cls.push("selected");
        const dots = on.slice(0, 2).map((s) => '<span class="dot">' + escapeHtml(s.title || "Stop") + "</span>").join("");
        const more = on.length > 2 ? '<span class="dot">+' + (on.length - 2) + " more</span>" : "";
        return '<button type="button" class="' + cls.join(" ") + '" data-date="' + c.iso + '"><span class="n">' + c.day + "</span>" + dots + more + "</button>";
      }).join("");

      $("cal-days").querySelectorAll("[data-date]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.selectedDate = btn.getAttribute("data-date");
          $("date").value = state.selectedDate;
          renderCalendar();
          renderDayList();
        });
      });
    }

    function stopCard(s) {
      const draft = s.published === false ? " draft" : "";
      const badge = s.published === false ? " · draft" : "";
      const addr = s.address ? escapeHtml(s.address) : (s.lat != null ? s.lat + ", " + s.lng : "No address yet");
      return '<article class="stop' + draft + '" data-id="' + s.id + '">' +
        '<div class="stop-top"><div>' +
        "<h3>" + escapeHtml(s.title || "Stop") + badge + "</h3>" +
        '<div class="meta">' + fmtDateLabel(s.date) + " · " + timeRange(s) + "</div>" +
        '<div class="meta">' + addr + "</div>" +
        (s.notes ? '<p class="notes">' + escapeHtml(s.notes) + "</p>" : "") +
        '</div><div class="stop-actions">' +
        '<button type="button" class="btn edit">Edit</button>' +
        '<button type="button" class="btn btn-danger del">Delete</button>' +
        "</div></div></article>";
    }

    function wireStopCards(root) {
      root.querySelectorAll(".stop").forEach((el) => {
        const id = el.getAttribute("data-id");
        const s = state.stops.find((x) => x.id === id);
        if (!s) return;
        el.querySelector(".edit").addEventListener("click", () => fillForm(s));
        el.querySelector(".del").addEventListener("click", () => deleteStop(s.id));
      });
    }

    function renderDayList() {
      $("selected-date-label").textContent = fmtDateLabel(state.selectedDate);
      const list = stopsOnDate(state.selectedDate);
      const el = $("day-list");
      if (!list.length) {
        el.innerHTML = '<p class="empty">No stops this day. Fill the form and save to add one.</p>';
        return;
      }
      el.innerHTML = list.map(stopCard).join("");
      wireStopCards(el);
    }

    function renderUpcoming() {
      const today = todayLocal();
      const up = state.stops.filter((s) => s.date >= today).slice(0, 30);
      const el = $("upcoming-list");
      if (!up.length) {
        el.innerHTML = '<p class="empty">No upcoming stops yet.</p>';
        return;
      }
      el.innerHTML = up.map(stopCard).join("");
      wireStopCards(el);
    }

    function renderAll() {
      renderCalendar();
      renderDayList();
      renderUpcoming();
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function fillForm(s) {
      $("stop-id").value = s.id;
      $("date").value = s.date;
      $("startTime").value = s.startTime || "";
      $("endTime").value = s.endTime || "";
      $("title").value = s.title || "";
      $("address").value = s.address || "";
      $("lat").value = s.lat != null ? s.lat : "";
      $("lng").value = s.lng != null ? s.lng : "";
      $("mapsUrl").value = "";
      $("notes").value = s.notes || "";
      $("published").checked = s.published !== false;
      $("form-heading").textContent = "Edit stop";
      $("delete-btn").hidden = false;
      $("save-btn").textContent = "Update stop";
      state.selectedDate = s.date;
      const [y, m] = s.date.split("-").map(Number);
      state.viewYear = y;
      state.viewMonth = m - 1;
      setStatus("Editing “" + (s.title || "stop") + "”", "ok");
      renderAll();
      $("title").focus();
    }

    function resetForm(keepDate) {
      const d = keepDate ? $("date").value : state.selectedDate || todayLocal();
      $("stop-form").reset();
      $("stop-id").value = "";
      $("date").value = d;
      $("published").checked = true;
      $("form-heading").textContent = "Add a stop";
      $("delete-btn").hidden = true;
      $("save-btn").textContent = "Save stop";
      setStatus("");
    }

    async function deleteStop(id) {
      if (!confirm("Delete this stop? Visitors will no longer see it.")) return;
      const res = await fetch("/api/admin/locations/" + encodeURIComponent(id), {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(err.error || "Could not delete", "err");
        return;
      }
      if ($("stop-id").value === id) resetForm(true);
      setStatus("Deleted.", "ok");
      await loadStops();
    }

    $("stop-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = $("stop-id").value;
      const body = {
        date: $("date").value,
        startTime: $("startTime").value,
        endTime: $("endTime").value,
        title: $("title").value,
        address: $("address").value,
        lat: $("lat").value,
        lng: $("lng").value,
        mapsUrl: $("mapsUrl").value,
        notes: $("notes").value,
        published: $("published").checked,
      };
      const res = await fetch(id ? "/api/admin/locations/" + encodeURIComponent(id) : "/api/admin/locations", {
        method: id ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || "Save failed", "err");
        return;
      }
      setStatus("Saved. " + (body.published ? "Visible on the site." : "Saved as draft."), "ok");
      state.selectedDate = body.date;
      await loadStops();
      resetForm(true);
    });

    $("reset-btn").addEventListener("click", () => resetForm(true));
    $("delete-btn").addEventListener("click", () => {
      const id = $("stop-id").value;
      if (id) deleteStop(id);
    });

    $("prev-month").addEventListener("click", () => {
      if (state.viewMonth === 0) { state.viewMonth = 11; state.viewYear--; }
      else state.viewMonth--;
      renderCalendar();
    });
    $("next-month").addEventListener("click", () => {
      if (state.viewMonth === 11) { state.viewMonth = 0; state.viewYear++; }
      else state.viewMonth++;
      renderCalendar();
    });

    (function init() {
      const t = todayLocal();
      const [y, m] = t.split("-").map(Number);
      state.viewYear = y;
      state.viewMonth = m - 1;
      state.selectedDate = t;
      $("date").value = t;
      loadStops();
    })();
  </script>
</body>
</html>`;
}
