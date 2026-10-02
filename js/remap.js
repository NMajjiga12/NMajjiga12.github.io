/*
 * remap.js - "Button remap" tab: version -> controller -> every button.
 * Generates the Classic Controller __parse_cl_data remapper.
 */
(function (MKW) {
  "use strict";
  const { data: D, codegen: G, dom } = MKW;
  const { el } = dom;

  function initRemap() {
    const $ = (id) => document.getElementById(id);
    const regionSel = $("remap-region");
    const ctrlSel = $("remap-controller");
    const hookBox = $("remap-hook-fields");
    const hookInputs = { hook: $("hook-addr"), a1: $("hook-analog-1"), a2: $("hook-analog-2") };
    const ctrlNote = $("remap-controller-note");
    const buttonsCard = $("remap-buttons-card");
    const rowsBox = $("remap-rows");
    const countPill = $("remap-count");
    const analogBox = $("remap-analog");
    const out = $("remap-output");
    const lineCount = $("remap-lines");
    const fileInput = $("remap-filename");
    const copyBtn = $("remap-copy");
    const dlBtn = $("remap-download");

    const defaults = () => Object.fromEntries(D.REMAP_ORDER.map((b) => [b, [b]]));
    const state = { mapping: defaults(), comboOpen: {}, analogTouched: false, text: "" };

    dom.fillSelect(regionSel, D.REGION_ORDER.map((k) => [k, D.REGIONS[k].label]), "NTSC-U");
    dom.fillSelect(ctrlSel, D.CONTROLLER_ORDER.map((k) => [k, D.CONTROLLERS[k]]), "classic");

    // ------------------------------------------------------------- rows
    const rows = {};
    for (const src of D.REMAP_ORDER) {
      rows[src] = buildRow(src);
      rowsBox.append(rows[src].root);
    }

    function buildRow(src) {
      const id = `remap-${src.toLowerCase()}`;
      const sel = el("select", { id, class: "remap-select" });
      sel.append(el("option", { value: "__keep" }, "Unchanged"));
      const actAs = el("optgroup", { label: "Act as" });
      for (const b of D.REMAP_ORDER) if (b !== src) actAs.append(el("option", { value: b }, MKW.label(b)));
      const other = el("optgroup", { label: "Other" },
        el("option", { value: "__combo" }, "Several buttons at once…"),
        el("option", { value: "__off" }, "Disabled (does nothing)"));
      sel.append(actAs, other);
      sel.addEventListener("change", () => onSelect(src, sel.value));

      const chipBtns = {};
      const chips = el("div", { class: "chips", role: "group", "aria-label": `Buttons that ${MKW.label(src)} presses`, hidden: true });
      for (const b of D.REMAP_ORDER) {
        chipBtns[b] = el("button", { type: "button", class: "chip", "aria-pressed": "false",
                                      title: MKW.label(b), onclick: () => toggleChip(src, b) },
                          dom.keycap(b, "key-xs"), el("span", null, MKW.short(b)));
        chips.append(chipBtns[b]);
      }
      const hint = el("p", { class: "chips-hint", hidden: true }, "Pick every button it should press together. None picked means disabled.");

      const root = el("div", { class: "remap-row" },
        el("label", { class: "src", for: id }, dom.keycap(src), el("span", { class: "src-name" }, MKW.label(src))),
        el("span", { class: "arrow", "aria-hidden": "true" }, "→"),
        sel, chips, hint);
      return { root, sel, chips, chipBtns, hint };
    }

    function onSelect(src, value) {
      state.comboOpen[src] = value === "__combo";
      if (value === "__keep") state.mapping[src] = [src];
      else if (value === "__off") state.mapping[src] = [];
      else if (value !== "__combo") state.mapping[src] = [value];
      updateRow(src);
      refresh();
    }

    function toggleChip(src, b) {
      const set = new Set(state.mapping[src]);
      set.has(b) ? set.delete(b) : set.add(b);
      state.mapping[src] = D.REMAP_ORDER.filter((x) => set.has(x));
      updateRow(src);
      refresh();
    }

    function updateRow(src) {
      const r = rows[src];
      const dst = state.mapping[src];
      const combo = state.comboOpen[src] || dst.length > 1;
      r.sel.value = combo ? "__combo" : !dst.length ? "__off" : dst[0] === src ? "__keep" : dst[0];
      r.chips.hidden = !combo;
      r.hint.hidden = !combo;
      for (const b of D.REMAP_ORDER) r.chipBtns[b].setAttribute("aria-pressed", String(dst.includes(b)));
      r.root.classList.toggle("changed", G.isChanged(state.mapping, src));
      r.root.classList.toggle("off", !dst.length);
    }

    function loadMapping(overrides) {
      state.mapping = Object.assign(defaults(), overrides);
      state.comboOpen = {};
      state.analogTouched = false;
      D.REMAP_ORDER.forEach(updateRow);
      refresh();
    }

    // ----------------------------------------------------------- output
    function currentHooks() {
      const known = D.REMAP_HOOKS[regionSel.value];
      if (known) return { hooks: known };
      const parsed = {};
      for (const [k, input] of Object.entries(hookInputs)) {
        parsed[k] = G.parseAddress(input.value);
        const needed = k === "hook" || analogBox.checked;
        input.setAttribute("aria-invalid", String(needed && input.value.trim() !== "" && parsed[k] == null));
      }
      if (parsed.hook == null) {
        return { error: "Enter the C2 hook address for this version (8 hex digits starting with 80) to generate the code." };
      }
      if (analogBox.checked && (parsed.a1 == null || parsed.a2 == null)) {
        return { error: "Enter both analog L/R write addresses, or turn off “Disable analog L/R shoulder data”." };
      }
      return { hooks: { hook: parsed.hook, analog: [parsed.a1, parsed.a2] } };
    }

    function refresh() {
      const changed = D.REMAP_ORDER.filter((b) => G.isChanged(state.mapping, b)).length;
      countPill.textContent = changed ? `${changed} changed` : "No changes yet";
      countPill.classList.toggle("on", changed > 0);
      if (!state.analogTouched) analogBox.checked = G.touchesShoulders(state.mapping);

      hookBox.hidden = Boolean(D.REMAP_HOOKS[regionSel.value]);
      const isClassic = ctrlSel.value === "classic";
      ctrlNote.hidden = isClassic;
      buttonsCard.classList.toggle("is-disabled", !isClassic);
      rowsBox.inert = !isClassic;

      let text = "";
      let message = "";
      if (!isClassic) {
        message = "The remapper only hooks the Classic Controller parser. Switch the controller to Classic Controller, or use the Activators tab for this controller.";
      } else {
        const h = currentHooks();
        if (h.error) message = h.error;
        else text = G.remapTxt(state.mapping, G.remapCode(h.hooks, state.mapping, analogBox.checked), analogBox.checked);
      }
      state.text = text;
      dom.renderCode(out, text, message);
      lineCount.textContent = text ? `${dom.countCodeLines(text)} code lines` : "";
      copyBtn.disabled = dlBtn.disabled = !text;
    }

    // ----------------------------------------------------------- events
    regionSel.addEventListener("change", refresh);
    ctrlSel.addEventListener("change", refresh);
    Object.values(hookInputs).forEach((i) => i.addEventListener("input", refresh));
    analogBox.addEventListener("change", () => { state.analogTouched = true; refresh(); });
    $("remap-reset").addEventListener("click", () => loadMapping({}));
    $("remap-example").addEventListener("click", () => loadMapping(D.EXAMPLE_REMAP));
    copyBtn.addEventListener("click", () => dom.copyText(state.text, copyBtn));
    dlBtn.addEventListener("click", () =>
      dom.downloadText(dom.safeFilename(fileInput.value, "classic_remap.txt"), state.text));

    D.REMAP_ORDER.forEach(updateRow);
    refresh();
  }

  MKW.initRemap = initRemap;
})(globalThis.MKW = globalThis.MKW || {});
