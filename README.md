# CNC Hobby Calc

Spindle speed and feed rate calculator for **Genmitsu 3018-PROVER**, with output mapped to **Autodesk Fusion 360** CAM fields.

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

## Fusion 360 workflow

1. Create or edit a tool in **Manufacture → Manage → Tool Library** (diameter, flutes).
2. Open a toolpath → **Feed & Speed** tab:
   - **Spindle speed** ← calculator RPM
   - **Cutting feedrate** ← calculator cutting feed (mm/min)
   - **Plunge feedrate** ← calculator plunge feed
   - **Feed per tooth** ← calculator fz (optional; Fusion can derive feed from this)
3. **Passes** tab:
   - **Maximum roughing stepdown** ← depth of cut (ap)
   - **Horizontal / radial stepover** ← stepover (ae)

Use **Copy for Fusion** to paste all values at once.

## Formulas

| Output | Formula |
|--------|---------|
| Spindle speed | `RPM = (Vc × 1000) / (π × D)` |
| Cutting feed | `RPM × flutes × fz` |
| MRR | `stepover × stepdown × cutting feed` |

Material presets are conservative for 3018-class rigidity and spindle power.
