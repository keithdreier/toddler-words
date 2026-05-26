# Toddler Words

> **Warning**
> This project is 100% vibe coded and shared as-is. Use it, modify it, and install it at your own risk. I built it for my own kid and make no guarantees about correctness, safety, browser behavior, or long-term maintenance.

Toddler Words is a simple fullscreen flashcard PWA I built for my 2-year-old. He loves words, vehicles, dinosaurs, shows, construction machines, and very specific things like `tiramisu`, `opera house`, `big gray wolf`, `Dino Dana`, and `monster truck`, so the app is designed around real words a toddler actually recognizes instead of only generic early-reader lists.

It is mobile-first, kid-safe, offline-capable, and intentionally small: no ads, no accounts, no backend, no tracking.

## What It Does

- Shows one large word or phrase at a time.
- Supports swipe left/right and large edge arrows for changing words.
- Uses browser speech synthesis to read words aloud.
- Lets parents add, edit, delete, search, and categorize words.
- Stores the word library and settings locally in `localStorage`.
- Works offline after first load as an installable PWA.
- Includes practice history for each word: how many times it was seen and heard.

## Kid Mode

The main screen is intentionally minimal:

- One big card.
- Big left/right navigation.
- A small read-ready icon or cooldown ring.
- A tiny progress counter.
- A hidden parent gear inside the card.

The child can change words and, if speech is enabled, tap the card to hear the current word. Parent settings are behind a long press on the gear.

## Parent Settings

Parent Settings includes:

- Word set/category filter.
- Uppercase cards toggle.
- Shuffle words toggle.
- Hide favorites toggle.
- Enable speech toggle.
- Speech wait setting.
- Install button when the browser exposes PWA installation.
- Manage Words screen.

## Manage Words

The word manager lets you:

- Add a word or phrase.
- Edit existing words.
- Delete words.
- Assign words to categories.
- Mark words as favorites.
- Search words by text, category, or pronunciation override.
- Add new categories.
- See practice stats: `seen` and `heard`.

There is also an optional pronunciation override. Leave it blank unless the device voice says a word wrong. The `test` button lets you hear the word or override before saving.

## Speech Behavior

Speech uses `window.speechSynthesis`.

By default:

- Speech is enabled.
- A word cannot be read immediately when it appears.
- The default speech wait is 3 seconds.
- The card shows a circular progress ring while waiting.
- When ready, the card shows a volume icon.

Parents can turn speech off entirely. When speech is off, the card is silent and the speech UI is hidden.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the local URL printed by Vite.

For local-network testing on a phone, use the network URL Vite prints, usually:

```text
http://<your-computer-ip>:5173
```

Your phone and computer need to be on the same Wi-Fi network.

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

The production preview is the best way to test PWA behavior locally:

```text
http://localhost:4173
```

## Install As A PWA On Android

For a real install test on Android, use the production build:

```bash
npm run build
npm run preview
```

Then open the app in Chrome. Chrome requires HTTPS for installable PWAs except on `localhost`, so for phone testing without deployment you can expose the preview server with a temporary HTTPS tunnel such as ngrok or Cloudflare Tunnel.

Once opened in Chrome:

1. Open Parent Settings with a long press on the gear.
2. If available, tap **install app**.
3. Or use Chrome's menu and choose **Install app** / **Add to Home screen**.

The installed app is configured as `Toddler Words`, fullscreen, landscape-first.

## Test

```bash
npm test
```

Tests cover:

- Word library persistence.
- Category filtering.
- Speech wrapper behavior.
- Practice history persistence and counters.

## Tech Stack

- Vite
- React
- TypeScript
- Vitest
- Browser `speechSynthesis`
- Service worker + web app manifest

## Privacy

Everything stays on the device. The app does not use a backend, analytics, ads, cookies, or accounts.
