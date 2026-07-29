#!/usr/bin/env python3
"""
Re-download the live Canva-hosted site into canva-mirror/.
Use when Muriah updates the Canva design and you want the self-hosted
copy to match exactly again.

  python3 scripts/refresh-canva-mirror.py
"""

from __future__ import annotations

import json
import re
import ssl
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BASE = "https://presskitchenandcatering.com"
ROOT = Path(__file__).resolve().parents[1] / "canva-mirror"


def ssl_context():
    ctx = ssl.create_default_context()
    try:
        urllib.request.urlopen(BASE + "/", context=ctx, timeout=20)
        return ctx
    except Exception:
        return ssl._create_unverified_context()


def fetch(url: str, dest: Path, ctx) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=90) as r:
        dest.write_bytes(r.read())
    return "ok"


def js_single_unescape(text: str) -> str:
    out = []
    i = 0
    n = len(text)
    while i < n:
        if text[i] == "\\" and i + 1 < n:
            c = text[i + 1]
            if c in "ntr":
                out.append("\\" + c)
                i += 2
                continue
            if c == "u" and i + 5 < n and all(
                ch in "0123456789abcdefABCDEF" for ch in text[i + 2 : i + 6]
            ):
                out.append(text[i : i + 6])
                i += 6
                continue
            if c in "\\'\"/":
                out.append(c)
                i += 2
                continue
            if c in "bf":
                out.append("\\")
                out.append(c)
                i += 2
                continue
            out.append("\\")
            out.append(c)
            i += 2
            continue
        out.append(text[i])
        i += 1
    return "".join(out)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    ctx = ssl_context()
    index = ROOT / "index.html"
    fetch(BASE + "/", index, ctx)
    html = index.read_text(encoding="utf-8", errors="replace")

    idx = html.find("window['bootstrap'] = JSON.parse('")
    start = html.find("JSON.parse('", idx) + len("JSON.parse('")
    end = html.find("');", start)
    data = json.loads(js_single_unescape(html[start:end]))
    blob = html + json.dumps(data)

    pat = re.compile(
        r"_assets/[A-Za-z0-9_./\-]+\.(?:js|css|png|jpg|jpeg|webp|gif|svg|woff2?|mp4|m4a|M4A|m3u8?|ico)",
        re.I,
    )
    assets = set(pat.findall(blob))
    for m in re.finditer(r'(?:href|src)="(_assets/[^"]+)"', html):
        assets.add(m.group(1).split("?")[0])
    assets = sorted(assets)
    print(f"Downloading {len(assets)} assets…")

    ok = fail = 0

    def one(path: str):
        try:
            fetch(BASE + "/" + path, ROOT / path, ctx)
            return path, None
        except Exception as e:
            return path, e

    with ThreadPoolExecutor(max_workers=12) as ex:
        for path, err in ex.map(lambda p: one(p), assets):
            if err:
                fail += 1
                print("FAIL", path, err)
            else:
                ok += 1

    total = sum(p.stat().st_size for p in ROOT.rglob("*") if p.is_file())
    print(f"done ok={ok} fail={fail} size_mb={total / 1024 / 1024:.1f}")
    print(f"mirror: {ROOT}")


if __name__ == "__main__":
    main()
