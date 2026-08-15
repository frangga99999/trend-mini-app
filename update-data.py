#!/usr/bin/env python3
"""update-data.py — Generate data.json untuk Telegram Mini App IDEA SCRAPPER.

Membaca /Users/elfranggo/.hermes/trend-memory.md (ditulis tiap laporan cron 09:00 WIB)
dan menghasilkan data.json untuk repo trend-mini-app (GitHub Pages).

Format baris trend-memory.md:
    - **Nama Tren** | kategori | YYYY-MM-DD | skor | stage | region | produk-terkait

Usage:
    python3 update-data.py            # tulis data.json di repo ini
    python3 update-data.py --push     # + git add/commit/push ke GitHub
"""
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

MEMORY = Path.home() / ".hermes" / "trend-memory.md"
REPO = Path(__file__).resolve().parent
OUT = REPO / "data.json"

ENTRY_RE = re.compile(r"^\s*[-*]\s+\**([^*]+?)\**\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*(.*)$")


def parse_memory(path: Path) -> list[dict]:
    if not path.exists():
        return []
    entries = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = ENTRY_RE.match(line)
        if not m:
            continue
        trend, cat, date, score, stage, region, product = [x.strip() for x in m.groups()]
        if not trend:
            continue
        entries.append({
            "trend": trend,
            "category": cat or None,
            "date": date or None,
            "score": score if score.isdigit() else None,
            "stage": stage or None,
            "region": region or None,
            "product": product or None,
        })
    return entries


def build(entries: list[dict]) -> dict:
    cats = [e["category"] for e in entries if e.get("category")]
    dominant = max(set(cats), key=cats.count) if cats else None
    by_trend: dict[str, int] = {}
    for e in entries:
        by_trend[e["trend"]] = by_trend.get(e["trend"], 0) + 1
    repeating = sorted([t for t, c in by_trend.items() if c > 1], key=lambda t: -by_trend[t])[:5]
    return {
        "updated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "summary_title": "Ringkasan Tren Hari Ini",
        "summary": f"Laporan harian terakhir tercatat: {len(entries)} tren dalam trend memory. "
                   f"Kategori dominan: {dominant or 'belum ada'}. "
                   f"Tren yang berulang (indikasi tren sejati): {', '.join(repeating) or 'belum ada'}.",
        "top3": [],
        "insights": [],
        "regions": [],
        "products": [],
        "memory": {
            "stats": {"total": len(entries), "dominant": dominant, "repeating": repeating},
            "entries": entries[-30:],
        },
    }


def main() -> int:
    entries = parse_memory(MEMORY)
    payload = {"data": build(entries)}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(entries)} entri memory -> {OUT.relative_to(REPO)}")

    if "--push" in sys.argv:
        subprocess.run(["git", "add", "data.json"], cwd=REPO, check=True)
        subprocess.run(["git", "commit", "-m", f"data: update laporan {datetime.now():%Y-%m-%d %H:%M}"],
                       cwd=REPO, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=REPO, check=True)
        print("PUSH: data.json terkirim ke GitHub Pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
