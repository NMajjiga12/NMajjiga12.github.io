/*
 * activators.js - "Activators" tab: build a list of codes, each wrapped in one
 * or more activator conditions (buttons, shake, tilt, GCN stick).
 * Imports/exports the same mappings.json format as the Python `build` command.
 */
(function (MKW) {
  "use strict";
  const { data: D, codegen: G, dom } = MKW;
  const { el } = dom;

  const TYPES = [["buttons", "Buttons held"], ["shake", "Shake"], ["tilt", "Wii Remote tilt"], ["stick", "GCN stick direction"]];
  const SLOTS = [1, 2, 3, 4].map((n) => [n, `Player ${n}`]);

  const newCondition = () => ({
    type: "buttons", controller: "classic", slot: 1, buttons: [], mode: "atleast",
    device: "remote", orientation: "vertical", port: 1, stick: "main", direction: "up",
  });

  /** Condition (UI state) -> spec (the JSON / codegen format). */
  function toSpec(c) {
    switch (c.type) {
      case "buttons": return { type: "buttons", controller: c.controller, slot: c.slot, buttons: [...c.buttons], mode: c.mode };
      case "shake":   return { type: "shake", device: c.device, slot: c.slot };
      case "tilt":    return { type: "tilt", orientation: c.orientation };
      case "stick":   return { type: "stick", port: c.port, stick: c.stick, direction: c.direction };
    }
    return null;
  }

  /** Spec from a JSON file -> condition, validating as it goes. */
  function fromSpec(spec) {
    const c = newCondition();
    c.type = spec.type || "buttons";
    if (!TYPES.some(([t]) => t === c.type)) throw new G.CodeError(`Unknown activator type "${c.type}".`);
    if (c.type === "buttons") {
      c.controller = G.normController(spec.controller || "classic");
      c.slot = Number(spec.slot ?? 1);
      c.mode = spec.mode || "atleast";
      const picked = new Set((spec.buttons || []).map((b) => G.normButton(c.controller, b)));
      c.buttons = D.BUTTON_ORDER[c.controller].filter((b) => picked.has(b));
      G.buttonValue(c.controller, [...picked]);   // throws on unknown names
    } else if (c.type === "shake") {
      c.device = spec.device || "remote";
      c.slot = Number(spec.slot ?? 1);
    } else if (c.type === "tilt") {
      c.orientation = spec.orientation || "vertical";
    } else {
      c.port = Number(spec.port ?? 1);
      c.stick = spec.stick || "main";
      c.direction = spec.direction || "up";
    }
    return c;
  }

  function describe(c) {
    switch (c.type) {
      case "buttons": {
        const who = { classic: "Classic Controller", wheel: "Wii Remote", gcn: "GCN port" }[c.controller];
        const btns = c.buttons.map((b) => MKW.short(b)).join("+") || "no buttons";
        return `${who} ${c.slot}: ${c.mode === "exact" ? "only " : ""}${btns}`;
      }
      case "shake": return `Shake ${c.device === "remote" ? "Wii Remote" : "Nunchuk"} ${c.slot}`;
      case "tilt":  return `Wii Remote 1 held ${c.orientation}`;
      case "stick": return `GCN port ${c.port} ${c.stick === "c" ? "C-stick" : "control stick"} ${c.direction}`;
    }
    return "";
  }

  function initActivators() {
    const $ = (id) => document.getElementById(id);
    const regionSel = $("act-region");
    const titleInput = $("act-title");
    const condBox = $("act-conditions");
    const codeInput = $("act-code");
    const preview = $("act-preview");
    const warnList = $("act-warnings");
    const saveBtn = $("act-save");
    const cancelBtn = $("act-cancel");
    const formTitle = $("act-form-title");
    const list = $("act-list");
    const emptyNote = $("act-empty");
    const countPill = $("act-count");
    const out = $("act-output");
    const status = $("act-status");
    const fileInput = $("act-filename");
    const copyBtn = $("act-copy");
    const dlBtn = $("act-download");

    const state = { entries: [], form: { conditions: [newCondition()] }, editing: null, text: "" };

    dom.fillSelect(regionSel, D.REGION_ORDER.map((k) => [k, D.REGIONS[k].label]), "NTSC-U");

    // ------------------------------------------------------- condition cards
    function renderConditions() {
      const conds = state.form.conditions;
      condBox.replaceChildren(...conds.map((c, i) => conditionCard(c, i, conds.length)));
      updatePreview();
    }

    function conditionCard(c, i, total) {
      const rerender = (fn) => (v) => { fn(v); renderConditions(); };
      const live = (fn) => (v) => { fn(v); updatePreview(); };

      const typeSel = dom.select(TYPES, c.type, rerender((v) => { c.type = v; }));
      typeSel.setAttribute("aria-label", `Condition ${i + 1} type`);
      const remove = el("button", { type: "button", class: "btn btn-quiet btn-sm", disabled: total === 1,
        onclick: () => { state.form.conditions.splice(i, 1); renderConditions(); } }, "Remove");

      const fields = el("div", { class: "field-row" });
      const extra = [];
      if (c.type === "buttons") {
        fields.append(
          dom.field("Controller", dom.select([["classic", "Classic Controller"], ["wheel", "Wii Remote / Nunchuk"], ["gcn", "GameCube"]], c.controller,
            rerender((v) => { c.controller = v; c.buttons = c.buttons.filter((b) => b in D.BUTTONS[v]); }))),
          dom.field("Slot", dom.select(SLOTS, c.slot, live((v) => { c.slot = Number(v); }))),
          dom.field("Match", dom.select([["atleast", "At least these"], ["exact", "Only these"]],
            c.mode, live((v) => { c.mode = v; }))));
        const chips = el("div", { class: "chips", role: "group", "aria-label": "Buttons to hold" });
        for (const b of D.BUTTON_ORDER[c.controller]) {
          const chip = el("button", { type: "button", class: "chip", title: MKW.label(b),
            "aria-pressed": String(c.buttons.includes(b)),
            onclick: () => {
              const on = !c.buttons.includes(b);
              c.buttons = D.BUTTON_ORDER[c.controller].filter((x) => (x === b ? on : c.buttons.includes(x)));
              chip.setAttribute("aria-pressed", String(on));
              updatePreview();
            } }, dom.keycap(b, "key-xs"), el("span", null, MKW.short(b)));
          chips.append(chip);
        }
        extra.push(el("div", { class: "field" }, el("span", null, "Buttons to hold"), chips));
      } else if (c.type === "shake") {
        fields.append(
          dom.field("Device", dom.select([["remote", "Wii Remote"], ["nunchuk", "Nunchuk"]], c.device, live((v) => { c.device = v; }))),
          dom.field("Slot", dom.select(SLOTS, c.slot, live((v) => { c.slot = Number(v); }))));
      } else if (c.type === "tilt") {
        fields.append(dom.field("Wii Remote 1 held", dom.select([["vertical", "Vertical"], ["sideways", "Sideways"]],
          c.orientation, live((v) => { c.orientation = v; }))));
      } else {
        fields.append(
          dom.field("Port", dom.select(SLOTS.map(([n]) => [n, `Port ${n}`]), c.port, live((v) => { c.port = Number(v); }))),
          dom.field("Stick", dom.select([["main", "Control stick"], ["c", "C-stick"]], c.stick, live((v) => { c.stick = v; }))),
          dom.field("Direction", dom.select([["up", "Up"], ["down", "Down"], ["left", "Left"], ["right", "Right"]],
            c.direction, live((v) => { c.direction = v; }))));
      }

      return el("div", { class: "cond" },
        el("div", { class: "cond-head" }, el("span", { class: "cond-num" }, `Condition ${i + 1}`), typeSel, remove),
        fields, extra);
    }

    // --------------------------------------------------------------- preview
    function currentEntry() {
      return { activators: state.form.conditions.map(toSpec), code: codeInput.value };
    }
    function defaultTitle() {
      return state.form.conditions.map(describe).join(" + ");
    }

    function updatePreview() {
      warnList.replaceChildren();
      titleInput.placeholder = defaultTitle();
      try {
        const { lines, warnings } = G.buildEntry(regionSel.value, currentEntry());
        dom.renderCode(preview, G.toTxt([{ title: titleInput.value.trim() || defaultTitle(), lines }]));
        warnings.forEach((w) => warnList.append(el("li", { class: "warn" }, w)));
        saveBtn.disabled = false;
      } catch (e) {
        if (!(e instanceof G.CodeError)) throw e;
        dom.renderCode(preview, "", "Fix the problem below to see the code.");
        warnList.append(el("li", { class: "error" }, e.message));
        saveBtn.disabled = true;
      }
    }

    // ------------------------------------------------------------ form state
    function resetForm() {
      state.form = { conditions: [newCondition()] };
      state.editing = null;
      titleInput.value = "";
      codeInput.value = "";
      formTitle.textContent = "New code";
      saveBtn.textContent = "Add to list";
      cancelBtn.hidden = true;
      renderConditions();
    }

    function save() {
      const entry = {
        title: titleInput.value.trim() || defaultTitle(),
        conditions: structuredClone(state.form.conditions),
        code: codeInput.value,
      };
      if (state.editing != null) state.entries[state.editing] = entry;
      else state.entries.push(entry);
      setStatus(state.editing != null ? `Updated “${entry.title}”.` : `Added “${entry.title}”.`);
      resetForm();
      renderList();
    }

    function edit(i) {
      const e = state.entries[i];
      state.editing = i;
      state.form = { conditions: structuredClone(e.conditions) };
      titleInput.value = e.title;
      codeInput.value = e.code;
      formTitle.textContent = "Edit code";
      saveBtn.textContent = "Save changes";
      cancelBtn.hidden = false;
      renderConditions();
      titleInput.focus();
    }

    // ------------------------------------------------------------ list/output
    function renderList() {
      const built = [];
      list.replaceChildren(...state.entries.map((e, i) => {
        let meta;
        let bad = false;
        try {
          const { lines } = G.buildEntry(regionSel.value, { activators: e.conditions.map(toSpec), code: e.code });
          built.push({ title: e.title, lines });
          meta = `${e.conditions.map(describe).join(" + ")} · ${lines.length} lines`;
        } catch (err) {
          if (!(err instanceof G.CodeError)) throw err;
          bad = true;
          meta = `Not included: ${err.message}`;
        }
        return el("li", { class: `entry${bad ? " bad" : ""}${state.editing === i ? " editing" : ""}` },
          el("div", { class: "entry-text" }, el("strong", null, e.title), el("small", null, meta)),
          el("button", { type: "button", class: "btn btn-quiet btn-sm", onclick: () => edit(i) }, "Edit"),
          el("button", { type: "button", class: "btn btn-quiet btn-sm", "aria-label": `Delete ${e.title}`,
            onclick: () => { state.entries.splice(i, 1); if (state.editing === i) resetForm(); renderList(); } }, "Delete"));
      }));
      emptyNote.hidden = state.entries.length > 0;
      countPill.textContent = `${built.length} ${built.length === 1 ? "code" : "codes"}`;
      countPill.classList.toggle("on", built.length > 0);
      state.text = built.length ? G.toTxt(built) : "";
      dom.renderCode(out, state.text, "Codes you add appear here as one .txt code list.");
      copyBtn.disabled = dlBtn.disabled = !state.text;
      $("act-export").disabled = $("act-clear").disabled = !state.entries.length;
    }

    function setStatus(msg, isError) {
      status.textContent = msg;
      status.classList.toggle("error", Boolean(isError));
    }

    // ---------------------------------------------------------- import/export
    async function importJson(file) {
      try {
        const cfg = JSON.parse(await file.text());
        const region = G.normRegion(cfg.region || regionSel.value);
        if (!Array.isArray(cfg.codes)) throw new G.CodeError('The file needs a "codes" list.');
        const entries = cfg.codes.map((c, n) => {
          const specs = c.activators || (c.activator ? [c.activator] : []);
          if (!specs.length) throw new G.CodeError(`Code ${n + 1} has no activator.`);
          return { title: c.title || `Code ${n + 1}`, conditions: specs.map(fromSpec), code: c.code || "" };
        });
        regionSel.value = region;
        state.entries = entries;
        resetForm();
        renderList();
        setStatus(`Imported ${entries.length} codes from ${file.name}.`);
      } catch (e) {
        setStatus(`Couldn't import ${file.name}: ${e instanceof SyntaxError ? "the file isn't valid JSON." : e.message}`, true);
      }
    }

    function exportJson() {
      const cfg = {
        region: regionSel.value,
        codes: state.entries.map((e) => ({ title: e.title, activators: e.conditions.map(toSpec), code: e.code })),
      };
      dom.downloadText("mappings.json", JSON.stringify(cfg, null, 2) + "\n", "application/json");
    }

    // ---------------------------------------------------------------- events
    regionSel.addEventListener("change", () => { updatePreview(); renderList(); });
    titleInput.addEventListener("input", updatePreview);
    codeInput.addEventListener("input", updatePreview);
    $("act-add-cond").addEventListener("click", () => { state.form.conditions.push(newCondition()); renderConditions(); });
    saveBtn.addEventListener("click", save);
    cancelBtn.addEventListener("click", () => { resetForm(); renderList(); });
    $("act-import").addEventListener("change", (ev) => {
      const f = ev.target.files[0];
      if (f) importJson(f);
      ev.target.value = "";
    });
    $("act-export").addEventListener("click", exportJson);
    $("act-clear").addEventListener("click", () => { state.entries = []; resetForm(); renderList(); setStatus("Cleared the list."); });
    copyBtn.addEventListener("click", () => dom.copyText(state.text, copyBtn));
    dlBtn.addEventListener("click", () => dom.downloadText(dom.safeFilename(fileInput.value, "codes.txt"), state.text));

    resetForm();
    renderList();
  }

  MKW.initActivators = initActivators;
})(globalThis.MKW = globalThis.MKW || {});
