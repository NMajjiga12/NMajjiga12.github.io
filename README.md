# MKWii Button Remapper Generator
A static web page for building Mario Kart Wii Gecko codes and remapping buttons based on controllers:

- **Button remap**: choose a version and controller, then choose what each Classic Controller button does. It generates the `__parse_cl_data` remapper. Buttons you leave unchanged stay mapped one-for-one.
- **Activators**: wrap your own code lines in button, shake, tilt or GameCube stick activators and build a code list. It imports and exports `mappings.json`.
- **Reference sheet**: every activator for one version.
- **Table check**: flags values in the forum address tables that break the controller struct pattern.

Every tab saves a plain `.txt` code list. To make a GCT, paste that text into an online GCT maker or Ocarina.

## Files

```
index.html          page structure
css/styles.css      all styling (light and dark mode)
js/data.js          address tables, button values, remapper hook addresses
js/codegen.js       Gecko code generation (no DOM, also runs in Node)
js/dom.js           shared DOM helpers (copy, download, keycap badges)
js/remap.js         Button remap tab
js/activators.js    Activators tab
js/reference.js     Reference sheet tab
js/check.js         Table check tab
js/main.js          tab switching and start-up
examples/mappings.json   example file for the Activators tab import
tests/codegen.test.js    checks the generator against known-good codes
```

The scripts are plain `<script>` files rather than ES modules, so `index.html` also works when you open it straight from disk.

## Deploy on GitHub Pages

1. Create a repository and push these files to the root of the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*. Then choose `main` and `/ (root)` and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Run the tests

```
node tests/codegen.test.js
```

## Adding remapper support for another version

The remapper hook addresses are only known for NTSC-U. For other versions the page asks you to type them in. Once you've confirmed the addresses for a version, add them to `REMAP_HOOKS` in `js/data.js` so the page fills them in automatically:

```js
"PAL": { hook: 0x80XXXXXX, analog: [0x80XXXXXX, 0x80XXXXXX] },
```
