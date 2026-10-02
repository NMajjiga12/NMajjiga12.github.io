/*
 * dom.js - small DOM helpers shared by every tab.
 */
(function (MKW) {
  "use strict";
  const D = MKW.data;
  const PROPS = new Set(["value", "checked", "selected", "disabled", "hidden", "type", "id"]);

  /** el("div", {class: "x", onclick: fn}, child, "text", ...) */
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (PROPS.has(k)) node[k] = v;
      else node.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c instanceof Node ? c : String(c));
    }
    return node;
  }

  function fillSelect(select, options, selected) {
    select.replaceChildren(...options.map(([value, label]) =>
      el("option", { value, selected: String(value) === String(selected) }, label)));
  }

  /** Builds a <label class="field"> wrapping a caption and a control. */
  function field(caption, control, extraClass) {
    return el("label", { class: `field${extraClass ? " " + extraClass : ""}` }, el("span", null, caption), control);
  }

  function select(options, value, onChange) {
    const s = el("select");
    fillSelect(s, options, value);
    s.addEventListener("change", () => onChange(s.value));
    return s;
  }

  /** Shows code with $/# comment lines dimmed, or a placeholder message when empty. */
  function renderCode(pre, text, placeholder) {
    pre.replaceChildren();
    pre.classList.toggle("placeholder", !text);
    if (!text) {
      pre.textContent = placeholder || "";
      return;
    }
    const lines = text.replace(/\n$/, "").split("\n");
    lines.forEach((l, i) => {
      if (l.startsWith("$") || l.startsWith("#")) pre.append(el("span", { class: "c" }, l));
      else pre.append(l);
      if (i < lines.length - 1) pre.append("\n");
    });
  }

  const countCodeLines = (text) => text.split("\n").filter((l) => /^[0-9A-F]{8} [0-9A-F]{8}$/.test(l)).length;

  function flash(button, message) {
    const original = button.dataset.label || button.textContent;
    button.dataset.label = original;
    button.textContent = message;
    clearTimeout(button._flash);
    button._flash = setTimeout(() => { button.textContent = original; }, 1600);
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = el("textarea", { class: "offscreen" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    if (button) flash(button, "Copied");
  }

  function safeFilename(name, fallback, ext = ".txt") {
    let n = String(name || "").trim().replace(/[\\/:*?"<>|]+/g, "_");
    if (!n) n = fallback;
    if (!n.toLowerCase().endsWith(ext)) n += ext;
    return n;
  }

  function downloadText(filename, text, type = "text/plain") {
    const blob = new Blob([text], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Keycap badge for a controller button: round face buttons, pill shoulders, square D-pad. */
  function keycap(button, extraClass) {
    const shape =
      ["A", "B", "X", "Y", "1", "2", "C"].includes(button) ? "round" :
      ["L", "R", "ZL", "ZR", "Z"].includes(button) ? "pill" :
      ["UP", "DOWN", "LEFT", "RIGHT"].includes(button) ? "dpad" : "small";
    const glyph = { UP: "▲", DOWN: "▼", LEFT: "◀", RIGHT: "▶", PLUS: "+", MINUS: "−", HOME: "⌂", START: "▶❙" }[button] || button;
    return el("span", { class: `key key-${shape}${extraClass ? " " + extraClass : ""}`, "aria-hidden": "true" }, glyph);
  }

  MKW.dom = { el, fillSelect, field, select, renderCode, countCodeLines, flash, copyText, safeFilename, downloadText, keycap };
  MKW.label = (b) => D.LABELS[b] || b;
  MKW.short = (b) => D.SHORT[b] || b;
})(globalThis.MKW = globalThis.MKW || {});
