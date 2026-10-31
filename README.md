# Wardo

**Your wardrobe, in your pocket.** Photograph your clothes, get clean cutouts, plan outfits, and never forget what you own.

Free, private and offline-first. No account, no server, no ads. Your photos and data stay on your phone.

<!-- Add 4 to 6 phone screenshots to docs/screenshots/ and uncomment:
<p>
  <img src="docs/screenshots/home.png" width="190" alt="Home">
  <img src="docs/screenshots/wardrobe.png" width="190" alt="Wardrobe">
  <img src="docs/screenshots/planner.png" width="190" alt="Planner">
  <img src="docs/screenshots/mix-match.png" width="190" alt="Mix and Match">
</p>
-->

## What it does

- **Add clothes** with the camera or gallery. Automatic cutout, or cut by hand with your finger. Touch up any photo later.
- **Organise** into Common (all year), Winter, Summer, Innerwear and Accessories, plus your own folders, tags, colours, categories and notes.
- **Find things** with search and filters (including laundry).
- **Track wearing:** what you wore, what you forgot, most-worn pieces.
- **Plan outfits** on a calendar, get a daily suggestion, build looks in **Mix & Match**, and save **favorite outfits**.
- **Laundry status**, **price and cost per wear**, and a **wardrobe check** that points out gaps and duplicates.
- **Packing lists** for trips, built from your clean clothes.
- **Donate or sell** pieces you no longer wear, with a history.
- **Optional weather** (off by default) to suggest lighter or warmer pieces.
- **Private by design:** PIN lock, a hidden Innerwear section, and backup files you own.
- **Wardrobe Wrapped:** a shareable picture of your month in clothes, made on your phone.
- **Colour match** for every piece, and a **hanger rail** view of your wardrobe.
- **Fast on any phone:** Fast, Balanced and Full speed modes, a flat, pure-black dark theme, a clean light theme and a choice of accent colours.

## Privacy

- Photos, clothes and plans are stored only in your browser's storage on your phone. Nothing is uploaded.
- The first automatic cutout downloads the cutout model once from IMG.LY's CDN, then keeps it for offline use. Cutting by hand needs no download.
- Weather is **off by default**. If you turn it on, only the coordinates of the place you choose are sent to [Open-Meteo](https://open-meteo.com/).
- Back up often from Profile. Clearing your browser data or uninstalling the app removes your wardrobe.

## Install on a phone

1. Open the Wardo link in Chrome (Android) or Safari (iPhone).
2. Android: menu, then **Install app**. iPhone: Share, then **Add to Home Screen**.
3. Open it once with internet so it can save itself. After that it works offline.

## Run locally

```bash
npm install
npm run dev      # development, opens on your network too
npm run build    # production build in dist/
npm run preview
```

Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Built with

React, Vite, Dexie (IndexedDB), vite-plugin-pwa (Workbox) and [@imgly/background-removal](https://github.com/imgly/background-removal-js) for on-device cutouts. Weather data by [Open-Meteo.com](https://open-meteo.com/).

## Licence

Wardo is released under the **GNU Affero General Public License v3.0** (see `LICENSE`). This is because it uses `@imgly/background-removal`, which is AGPL-3.0, so the app that includes it must be shared under the same licence, with its source available to users. If you want to use Wardo in a closed-source or commercial product, you would need a commercial licence from IMG.LY for the cutout library and from Open-Meteo for weather data, or swap those parts out.

## More

- [Changelog](CHANGELOG.md)
- [Real-phone test checklist](docs/TESTING.md)
- [Launch kit: LinkedIn, resume and portfolio text](docs/LAUNCH.md)
