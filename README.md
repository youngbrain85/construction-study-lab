# Construction Study Lab

Interactive labs for construction materials (CNST-111). First module: **Mix Design Lab** — proportion a concrete mix with the ACI PRC-211.1-22 tables, then run virtual slump (ASTM C143) and compression (ASTM C39) tests.

## Play

https://mixlab-concrete-game.netlify.app

## Structure

- `site/index.html` — hub landing page listing all available labs
- `site/labs/mix-design/` — Mix Design Lab module
- `site/shared/theme.css` — design system (colors, typography, spacing)

To add a new lab: create a folder in `site/labs/`, add lab files, then register it in `index.html`'s `LABS` array.

## Dev

```sh
python -m http.server 8123 --directory site
```

Then open http://localhost:8123

## Test

```sh
node --test engine.test.mjs
```
