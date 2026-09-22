# lauaialerfi.com

Source for Lauai Alerfi's engineering portfolio, live at https://lauaialerfi.com.

The site is a 3D scene built with Three.js and Vite. It opens on a desk, and every project is a device on that desk: click the FPGA board to zoom into the ARINC 429 work, click the die to fly into the Sky130 SRAM macro, and so on. Experience cards sit next to the desk and open into the detail bullets. A plain single page version is kept as the fallback for phones and for anything that cannot run WebGL.

## Layout

- `index.html`, `src/` the 3D site. `src/world/` holds the desk, the board, the die and the procedural props, `src/camera.js` the fly in and fly out moves, `src/holo.js` the floating cards, `src/content/` the project and experience data.
- `public/classic/index.html` the fallback page. It is also the source of truth for project text: `tools/extract-content.mjs` turns it into `src/content/generated.json`, so text is edited once.
- `public/models/` the GLB models with `manifest.json` recording where each came from and its licence, rendered into `public/credits.html` by `tools/build-credits.mjs`.
- `tools/` the gates every change passes before it ships: `lint-style.mjs` fails the build on banned punctuation, `check-budget.mjs` fails it when the first load goes over 30 MB, `shot.mjs` takes headless screenshots of the desk, board and die views, `phone-check.mjs` checks the fallback.

## Working on it

```
npm install
npm run dev
npm run build
npm run shot
```

`npm run build` runs the content extraction and the lint first and the size budget after. Deploys go through Netlify: every pull request gets a preview URL and `main` is the live site.

Deep links: `?shot=desk`, `?shot=board:<mount>` and `?shot=die:<chip>` open the site on a given view, which is what the screenshot tool uses.

## Credits

Third party models and textures are listed with their licences at https://lauaialerfi.com/credits.html.
