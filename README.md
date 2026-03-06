# Khatmah

![App Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

A Ramadan reading companion for the **CMU-Q Muslim Student Association**. Plan your khatmah by calculating daily juz' and page targets for the standard 604-page Madani Mushaf.

## Features

* **Dynamic scheduling:** Enter how many khatmahs you want to complete; the app calculates juz' and page ranges for each of the 30 days.
* **Hijri date detection:** Uses `Intl.DateTimeFormat` (islamic-umalqura) to detect the current Ramadan day.
* **Hijri offset:** +/- buttons to adjust for local moon sighting differences.
* **Mark as done:** Tap a day card to mark it complete. Progress persists in `localStorage`.
* **Horizontal carousel:** Swipe or drag through days; auto-scrolls to today on load.
* **Outside Ramadan:** Defaults to Day 1 with a polite "Ramadan is approaching" banner.
* **Installable:** Add to home screen as a web app (PWA). Works offline after first visit.

## Tech Stack

* **Frontend:** HTML5, Tailwind CSS (CDN), Vanilla JavaScript
* **No build step:** Static files only
* **PWA:** Web app manifest, service worker, offline caching

## How to Run

1. Clone the repository.
2. Open `index.html` in a browser, or serve the folder with a local server (e.g. `python -m http.server 8000`).

**VS Code:** Use the "Live Server" extension and open with Live Server.

## Install as Web App

1. Serve over **HTTPS** (or localhost for testing).
2. Visit the app in Chrome, Edge, or Safari.
3. Use **Add to Home Screen** (mobile) or the install icon in the address bar (desktop).

## Project Structure

```
├── index.html    # Semantic HTML + Tailwind
├── styles.css    # Custom overrides, glassmorphism, scrollbar hiding
├── app.js        # State management, Hijri logic, render
├── sw.js         # Service worker (offline caching)
├── manifest.json # Web app manifest
├── icon-192.png    # PWA icon (192×192)
├── icon-512.png    # PWA icon (512×512)
├── khatmah_logo.png # App icon / header logo
├── logo.png        # CMU-Q MSA logo
└── README.md
```

## Acknowledgments

* CMU-Q Muslim Student Association
* Standard Madani Mushaf (604 pages) for juz'–page mapping
