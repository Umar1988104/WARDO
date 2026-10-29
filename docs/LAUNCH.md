# Launch kit

## One-line pitch
Wardo is a private, offline wardrobe app: photograph your clothes, get clean cutouts on your phone, and plan outfits. No account, no uploads.

## GitHub repo
- **Description:** Private, offline-first wardrobe PWA with on-device photo cutouts, outfit planner, laundry, cost per wear and packing lists.
- **Topics:** pwa, react, vite, indexeddb, offline-first, wardrobe, privacy, dexie
- Pin the repo, add 4 to 6 screenshots to `docs/screenshots/`, and put the live link in the repo's website field.

## LinkedIn post (edit with your real numbers and story)
I built Wardo, a wardrobe app that keeps everything on your phone.

Most wardrobe apps want an account and upload your photos. I wanted the opposite: no sign-up, works offline, and your clothes never leave the device.

What it does: automatic photo cutouts that run on the phone, an outfit planner with Mix & Match, laundry and cost-per-wear tracking, trip packing lists, and a wardrobe check that points out gaps and duplicates. There is also a PIN-locked hidden section and backups you own.

Built with React, Vite, IndexedDB (Dexie) and a service worker, as a solo project, and tested on a real Android phone. I learned a lot about offline-first design, Android back-button handling in a PWA, and keeping an app fast on low-end phones.

Try it: <live link>
Code: <GitHub link>

#react #pwa #webdev #buildinpublic

## Resume bullets (keep only what you can back up)
- Built Wardo, an offline-first wardrobe PWA (React, Vite, IndexedDB/Dexie, Workbox) with on-device background removal, outfit planning and backup/restore. Deployed on GitHub Pages.
- Designed performance modes (animation, blur and background controls) and fixed Android back-button navigation by managing browser history for sheets and screens.
- Implemented privacy features: PIN lock, hidden section, and optional weather that sends only a chosen city's coordinates.

## Portfolio blurb
Wardo is a solo-built, privacy-first wardrobe app. Everything runs in the browser: photos are processed on the device, data lives in IndexedDB, and the app installs and works offline. Features include a calendar outfit planner, Mix & Match, laundry and cost-per-wear tracking, packing lists, and a wardrobe gap and duplicate check.
