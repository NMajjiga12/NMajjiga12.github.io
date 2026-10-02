/* ui.js - small DOM helpers: element builder, keycaps, code view, copy and download. */
(function (MKW) {
  "use strict";
  const { LABELS, SHORT } = MKW.data;

  /** el("div", {class: "x"}, child, "text") - plain attributes only. */
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    node.append(...children);
    return node;
  }

  const options = (pairs) => pairs.map(([value, text]) => el("option", { value }, text));
  const label = (b) => LABELS[b] || b;
  const short = (b) => SHORT[b] || b;

  // SVG icons for buttons without a letter (Unicode arrows can turn into emoji)
  const ICONS = {
    UP: "M8 3.5 13 11H3z", RIGHT: "M12.5 8 5 13V3z", DOWN: "M8 12.5 3 5h10z", LEFT: "M3.5 8 11 3v10z",
    HOME: "M2.5 8 8 3l5.5 5M4.5 6.5V13h7V6.5", PLUS: "M8 3.5v9M3.5 8h9", MINUS: "M3.5 8h9",
  };
  const FILLED = new Set(["UP", "RIGHT", "DOWN", "LEFT"]);
  const SHAPE = { A: "round", B: "round", X: "round", Y: "round", L: "pill", R: "pill", ZL: "pill", ZR: "pill",
                  UP: "dpad", DOWN: "dpad", LEFT: "dpad", RIGHT: "dpad" };

  /** Keycap shaped like the Classic Controller button: round face, pill shoulder, square D-pad. */
  function keycap(b) {
    const cap = el("span", { class: `key key-${SHAPE[b] || "small"}`, "aria-hidden": "true" });
    if (ICONS[b]) {
      const style = FILLED.has(b) ? 'fill="currentColor"'
        : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
      cap.innerHTML = `<svg class="icon" viewBox="0 0 16 16"><path d="${ICONS[b]}" ${style}/></svg>`;
    } else {
      cap.textContent = b;
    }
    return cap;
  }

  /** Shows code with $ comment lines dimmed, or a message when there is no code. */
  function renderCode(pre, text, message) {
    pre.classList.toggle("placeholder", !text);
    if (!text) { pre.textContent = message; return; }
    const frag = document.createDocumentFragment();
    for (const l of text.trimEnd().split("\n")) {
      frag.append(l.startsWith("$") ? el("span", { class: "c" }, l) : l, "\n");
    }
    frag.lastChild.remove();
    pre.replaceChildren(frag);
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
    const original = button.dataset.label || button.textContent;
    button.dataset.label = original;
    button.textContent = "Copied";
    clearTimeout(button._t);
    button._t = setTimeout(() => { button.textContent = original; }, 1600);
  }

  function downloadText(name, text) {
    let file = String(name).trim().replace(/[\\/:*?"<>|]+/g, "_") || "classic_remap.txt";
    if (!/\.txt$/i.test(file)) file += ".txt";
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = el("a", { href: url, download: file });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  MKW.ui = { el, options, label, short, keycap, renderCode, copyText, downloadText };
})(globalThis.MKW = globalThis.MKW || {});
