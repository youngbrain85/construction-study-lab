# Construction Study Lab

Interactive labs and study materials for construction education.

First lab: **Mix Design Lab** — proportion a concrete mix with the ACI PRC-211.1-22 tables, then run virtual slump (ASTM C143) and compression (ASTM C39) tests. The three test scenes render in real-time 3D via a self-hosted three.js (`site/shared/vendor/`).

## Site

https://cnstlab.org

- `/` — home: one screen with two doors, **Lab** and **Study**
- `/labs/` — Lab section: Material Lab (Mix Design Lab, …) and Survey Lab
- `/study/` — Study section: notes, reference tables, worked examples (Materials, Surveying)
- `/labs/mix-design/` — Mix Design Lab module

## Structure

- `site/index.html` — home
- `site/labs/index.html`, `site/study/index.html` — section pages, rendered from the registry
- `site/shared/registry.js` — `window.SITE`: `LAB_GROUPS`, `LABS`, `STUDY_GROUPS`, `MATERIALS`
- `site/shared/dom.js` — shared DOM builder (`window.h`) used by the section pages
- `site/shared/theme.css` — design tokens and shared components (ISU brand palette and type)
- `site/labs/mix-design/` — Mix Design Lab module (`engine.js` scoring, `scene3d.js` three.js scenes)
- `docs/design/mockups/` — the approved mockups the pages are built from

**Add a lab:** create `site/labs/<id>/`, then add one entry to `LABS` in `site/shared/registry.js` (`group` = `material` or `survey`).
**Add study material:** add one entry to `MATERIALS` (`type` = `pdf` | `link` | `page`, `group` = `materials` or `surveying`).

## Dev

```sh
python tools/devserver.py 8123 site
```

Then open http://localhost:8123 (the custom server serves `.js` with the right MIME type and disables caching).

## Test

```sh
node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs
```
