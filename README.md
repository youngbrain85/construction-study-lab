# Construction Study Lab

Interactive labs and study materials for construction education.

First lab: **Mix Design Lab** — proportion a concrete mix with the ACI PRC-211.1-22 tables, then run virtual slump (ASTM C143) and compression (ASTM C39) tests. The three test scenes render in real-time 3D via a self-hosted three.js (`site/shared/vendor/`).

## Site

https://cnstlab.org

- `/` — home: one screen with two doors, **Lab** and **Study**
- `/labs/` — Lab section: a one-screen 3D lab room (fixed top-down view; hover a station, click to enter). Falls back to the text list when WebGL is unavailable
- `/study/` — Study section: notes, reference tables, worked examples (Materials, Surveying)
- `/labs/mix-design/` — Mix Design Lab module

## Structure

- `site/index.html` — home
- `site/labs/index.html` — Lab page: 3D room built by `site/labs/room/` (`layout.js` placement + camera math, `props.js` procedural equipment, `decor.js` bay door / wall fittings / yard gear, `lab-room.js` assembly and interaction); `site/labs/lab-list.js` renders the text list used as the fallback
- `site/study/index.html` — Study section page, rendered from the registry
- `site/shared/registry.js` — `window.SITE`: `LAB_GROUPS`, `LABS`, `STUDY_GROUPS`, `MATERIALS`
- `site/shared/dom.js` — shared DOM builder (`window.h`) used by the section pages
- `site/shared/theme.css` — design tokens and shared components (ISU brand palette and type)
- `site/study/article.css`, `site/study/article.js` — shared layout for study articles (hero, sticky contents, callouts, equations, tables)
- `site/study/mix-design/` — *Concrete mix design*, part 1 (method) and part 2 (worked example); photos in `img/`, prepared by `tools/prep-study-images.py`
- `site/study/aggregate-gradation/` — *Sieve analysis and the fineness modulus* (`index.html` + `gradation.js` + `calc.js`); photos in `img/`
- `site/study/slump-test/` — *The slump test, step by step* (`index.html`); photos in `img/`
- `site/study/concrete-cylinders/` — *Concrete cylinders: from the mold to the acceptance decision* (`index.html` + `cylinders.js` + `calc.js`); photos in `img/`
- `site/study/rebar-tension/` — *Testing reinforcing steel: the tension test* (`index.html`, static); photos in `img/`
- `site/study/air-yield/` — *Air content and unit weight* (`index.html`, static); photos in `img/`
- `site/study/soil-compaction/` — *Compaction control: the Proctor test and field density* (`index.html` + `compaction.js` + `calc.js`); photos in `img/`
- `site/labs/mix-design/` — Mix Design Lab module (`engine.js` scoring, `scene3d.js` three.js scenes)
- `docs/design/mockups/` — the approved mockups the pages are built from

**Add a lab:** the room already has a station for each lab (`station` = `mix` | `soil` | `steel` | `wood` | `survey`). Create `site/labs/<id>/`, then fill in that station's `LABS` entry in `site/shared/registry.js` (`href`, `desc`, `meta`, `active: true`) — the station lights up and links to it.
**Add study material:** add one entry to `MATERIALS` (`type` = `pdf` | `link` | `page`, `group` = `materials` or `surveying`). For a `page`, create `site/study/<id>/index.html` from `site/study/mix-design/index.html` as the template (link `article.css` and `article.js`, keep the contents `<nav class="toc">` in sync with the `h2` ids) and set `href` to `<id>/`.

## Dev

```sh
python tools/devserver.py 8123 site
```

Then open http://localhost:8123 (the custom server serves `.js` with the right MIME type and disables caching).

## Test

```sh
node --test engine.test.mjs tools/contrast-check.test.mjs tools/registry.test.mjs tools/study-tables.test.mjs tools/site-guards.test.mjs tools/layout.test.mjs tools/props.test.mjs tools/decor.test.mjs tools/compaction.test.mjs tools/cylinders.test.mjs tools/gradation.test.mjs tools/rebar.test.mjs tools/airyield.test.mjs
```
