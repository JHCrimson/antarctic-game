# Antarctic Expedition

A small turn-based hex game for your phone. Lead a party from a coastal hut to the South Pole, laying supply caches on the way.

**Play:** https://jhcrimson.github.io/antarctic-game/

## Put it on your phone

- **iPhone:** open the link in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the link in Chrome, open the menu, then **Install app** (or **Add to Home screen**).

Launch it from the new icon and it opens full screen, like an app.

## Development

```sh
npm install
npm run dev     # serves on your Wi-Fi too; open the printed Network URL on your phone
npm test        # unit tests for the game rules
npm run build   # production build into dist/
```

Every push to `main` is tested and deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Code layout

| Folder | What lives there |
| --- | --- |
| `src/core/` | Pure game logic: hex maths, game state, rules. No browser code; unit-tested. |
| `src/app/` | The store that holds the current state and applies actions. |
| `src/render/` | Canvas drawing and the camera (`View`). |
| `src/input/` | Touch and mouse handling: taps move, drags scroll. |
