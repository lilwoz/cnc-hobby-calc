# CNC Hobby Calc

Spindle speed and feed rate calculator for **Genmitsu 3018-PROVER**.

Plain HTML + CSS + JS — no build step, no frameworks.

## Local use

Open `index.html` in a browser, or run a simple server:

```bash
npx serve .
```

## Deploy

Upload `index.html`, `styles.css`, and `app.js` to any static host:

- [GitHub Pages](https://pages.github.com/) — enable Pages, source `/ (root)`
- [Netlify Drop](https://app.netlify.com/drop) — drag and drop the folder
- [Cloudflare Pages](https://pages.cloudflare.com/) — connect the repo

## Presets

Use **Download settings** to save all parameters as a JSON file. **Load settings** restores a previously saved file — useful for keeping per-material or per-tool configurations.

## Formulas

| Output | Formula |
|--------|---------|
| Spindle speed | `RPM = (Vc × 1000) / (π × D)` |
| Cutting feed | `RPM × flutes × fz` |
| MRR | `stepover × stepdown × cutting feed` |

Material presets are conservative for 3018-class rigidity and spindle power.
