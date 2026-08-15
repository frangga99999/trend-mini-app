# 📡 IDEA SCRAPPER — Telegram Mini App

Mini App dashboard tren & peluang bisnis harian (Indonesia). Statis, ringan (HTML+CSS+JS vanilla, ~20KB), dark theme Telegram.

## Struktur
- `index.html` / `styles.css` / `app.js` — web app (no framework, no CDN)
- `data.json` — data laporan (digenerate `update-data.py`)
- `update-data.py` — baca `~/.hermes/trend-memory.md` → `data.json`, opsi `--push` auto-commit

## Pipeline data
1. Cron Hermes (09:00 WIB) riset tren → tulis `~/.hermes/trend-memory.md`
2. `update-data.py --push` → `data.json` di GitHub Pages
3. Mini App fetch `data.json` tiap dibuka

## Live
https://frangga99999.github.io/trend-mini-app/
