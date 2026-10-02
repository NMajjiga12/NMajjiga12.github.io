/*
 * app.js - the remap page: version -> controller -> what each button does.
 * Rows are built once; two delegated listeners handle every select and chip,
 * and only the row that changed is updated.
 */
(function (MKW) {
  "use strict";
  const { REGIONS, CONTROLLERS, ORDER, HOOKS, EXAMPLE } = MKW.data;
  const G = MKW.codegen;
  const { el, options, label, short, keycap, renderCode, copyText, downloadText } = MKW.ui;
  const $ = (id) => document.getElementById(id);

  const regionSel = $("region");
  const ctrlSel = $("controller");
  const ctrlNote = $("controller-note");
  const hookBox = $("hook-fields");
  const hookInputs = [$("hook-addr"), $("hook-analog-1"), $("hook-analog-2")];
  const buttonsStep = $("buttons-step");
  const rowsBox = $("rows");
  const countText = $("count");
  const analogBox = $("analog");
  const out = $("output");
  const lineCount = $("line-count");
  const fileInput = $("filename");
  const copyBtn = $("copy");
  const dlBtn = $("download");

  const defaults = () => Object.fromEntries(ORDER.map((b) => [b, [b]]));
  let mapping = defaults();
  let comboOpen = new Set();
  let analogTouched = false;
  let text = "";
  let lastShown = null;

  regionSel.append(...options(REGIONS));
  ctrlSel.append(...options(CONTROLLERS));

  // ------------------------------------------------------------------ rows
  const targetOptions = (src) => [
    el("option", { value: "keep" }, "Unchanged"),
    el("optgroup", { label: "Act as" }, ...options(ORDER.filter((b) => b !== src).map((b) => [b, label(b)]))),
    el("optgroup", { label: "Other" }, ...options([["combo", "Several buttons at once…"], ["off", "Disabled (does nothing)"]])),
  ];

  const rows = {};
  for (const src of ORDER) {
    const sel = el("select", { id: `map-${src}`, "data-src": src }, ...targetOptions(src));
    const chips = el("div", { class: "chips", role: "group", "aria-label": `Buttons ${label(src)} presses`, hidden: "" },
      ...ORDER.map((b) => el("button", { type: "button", class: "chip", "data-src": src, "data-btn": b,
                                          "aria-pressed": "false", title: label(b) }, short(b))));
    const hint = el("p", { class: "chips-hint", hidden: "" }, "Pick every button it should press together. None picked means disabled.");
    const row = el("div", { class: "remap-row" },
      el("label", { class: "src", for: sel.id }, keycap(src), el("span", { class: "src-name" }, label(src))),
      el("span", { class: "arrow", "aria-hidden": "true" }, "→"),
      sel, chips, hint);
    rows[src] = { row, sel, chips, hint, chipBtns: chips.children };
    rowsBox.append(row);
  }

  function updateRow(src) {
    const r = rows[src];
    const dst = mapping[src];
    const combo = comboOpen.has(src) || dst.length > 1;
    r.sel.value = combo ? "combo" : !dst.length ? "off" : dst[0] === src ? "keep" : dst[0];
    r.chips.hidden = r.hint.hidden = !combo;
    if (combo) for (const c of r.chipBtns) c.setAttribute("aria-pressed", dst.includes(c.dataset.btn));
    r.row.classList.toggle("changed", G.isChanged(mapping, src));
    r.row.classList.toggle("off", !dst.length);
  }

  rowsBox.addEventListener("change", (e) => {
    const src = e.target.dataset.src;
    const v = e.target.value;
    v === "combo" ? comboOpen.add(src) : comboOpen.delete(src);
    if (v === "keep") mapping[src] = [src];
    else if (v === "off") mapping[src] = [];
    else if (v !== "combo") mapping[src] = [v];
    updateRow(src);
    refresh();
  });

  rowsBox.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const { src, btn } = chip.dataset;
    const picked = new Set(mapping[src]);
    picked.has(btn) ? picked.delete(btn) : picked.add(btn);
    mapping[src] = ORDER.filter((b) => picked.has(b));
    updateRow(src);
    refresh();
  });

  function load(overrides) {
    mapping = Object.assign(defaults(), overrides);
    comboOpen = new Set();
    analogTouched = false;
    ORDER.forEach(updateRow);
    refresh();
  }

  // ---------------------------------------------------------------- output
  function hooks() {
    const known = HOOKS[regionSel.value];
    if (known) return known;
    const [hook, a1, a2] = hookInputs.map((input, i) => {
      const value = G.parseAddress(input.value);
      const needed = i === 0 || analogBox.checked;
      input.setAttribute("aria-invalid", needed && input.value.trim() !== "" && value == null);
      return value;
    });
    if (hook == null) return "Enter the C2 hook address for this version (8 hex digits starting with 80) to generate the code.";
    if (analogBox.checked && (a1 == null || a2 == null)) {
      return "Enter both analog L/R write addresses, or turn off “Disable analog L/R shoulder data”.";
    }
    return { hook, analog: [a1, a2] };
  }

  function refresh() {
    const changed = ORDER.filter((b) => G.isChanged(mapping, b)).length;
    countText.textContent = changed ? `${changed} changed` : "No changes yet";
    countText.classList.toggle("on", changed > 0);
    if (!analogTouched) analogBox.checked = G.touchesShoulders(mapping);

    const isClassic = ctrlSel.value === "classic";
    hookBox.hidden = regionSel.value in HOOKS;
    ctrlNote.hidden = isClassic;
    buttonsStep.classList.toggle("is-disabled", !isClassic);
    rowsBox.inert = !isClassic;

    const h = isClassic ? hooks() : "The remapper only hooks the Classic Controller parser. Switch the controller to Classic Controller.";
    text = typeof h === "string" ? "" : G.remapText(h, mapping, analogBox.checked);
    const shown = text || h;
    if (shown === lastShown) return;   // same code or message as before: skip the redraw
    lastShown = shown;
    renderCode(out, text, h);
    lineCount.textContent = text ? `${text.split("\n").filter((l) => l && l[0] !== "$").length} code lines` : "";
    copyBtn.disabled = dlBtn.disabled = !text;
  }

  // ---------------------------------------------------------------- events
  regionSel.addEventListener("change", refresh);
  ctrlSel.addEventListener("change", refresh);
  hookBox.addEventListener("input", refresh);
  analogBox.addEventListener("change", () => { analogTouched = true; refresh(); });
  $("example").addEventListener("click", () => load(EXAMPLE));
  $("reset").addEventListener("click", () => load({}));
  copyBtn.addEventListener("click", () => copyText(text, copyBtn));
  dlBtn.addEventListener("click", () => downloadText(fileInput.value, text));

  load({});
})(globalThis.MKW = globalThis.MKW || {});
