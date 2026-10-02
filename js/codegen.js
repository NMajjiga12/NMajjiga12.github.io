/*
 * codegen.js - Gecko code generation (no DOM; also runs under Node for tests).
 *
 * Code types used
 *   28 = 16-bit "if equal"   : 28AAAAAA MMMMVVVV -> if ([addr] & ~MMMM) == VVVV
 *   2C = 16-bit "if greater" : same layout, >      (stick activators)
 *   2E = 16-bit "if lower"   : same layout, <
 *   24 / 26 = 32-bit "if greater" / "if lower" (shake + tilt float compares)
 *   C2 = insert ASM (button remapper)
 *   E0000000 80008000 = full terminator (closes every open conditional)
 */
(function (MKW) {
  "use strict";
  const D = MKW.data;

  class CodeError extends Error {
    constructor(message) { super(message); this.name = "CodeError"; }
  }

  // ---------------------------------------------------------------- helpers
  const hex = (n, width = 8) => (n >>> 0).toString(16).toUpperCase().padStart(width, "0");
  const addrOf = (hi, lo) => hi * 0x10000 + lo;

  /** One Gecko line with ba=0x80000000: type byte + low 25 bits of the address. */
  function line(type, address, value) {
    return `${hex(type * 0x1000000 + (address & 0x01FFFFFF))} ${hex(value)}`;
  }

  function normRegion(name) {
    const raw = String(name == null ? "" : name).trim();
    let key = raw.toUpperCase().replace(/_/g, "-");
    key = D.REGION_ALIASES[key] || key;
    if (!D.REGIONS[key]) {
      throw new CodeError(`Unknown version "${raw}". Choose from ${D.REGION_ORDER.join(", ")}.`);
    }
    return key;
  }

  function normController(c) {
    let key = String(c == null ? "" : c).trim().toLowerCase();
    key = D.CONTROLLER_ALIASES[key] || key;
    if (!D.BUTTONS[key]) throw new CodeError(`Unknown controller "${c}". Use classic, wheel or gcn.`);
    return key;
  }

  function slotIndex(slot) {
    const n = Number(slot);
    if (![1, 2, 3, 4].includes(n)) throw new CodeError("Slot/port must be 1-4.");
    return n - 1;
  }

  function normButton(controller, b) {
    const table = D.BUTTONS[controller];
    let key = String(b).trim().toUpperCase();
    if (!(key in table)) key = D.BUTTON_ALIASES[key] || key;
    return key;
  }

  function buttonValue(controller, buttons) {
    const table = D.BUTTONS[controller];
    let total = 0;
    for (const b of buttons) {
      const key = normButton(controller, b);
      if (!(key in table)) {
        throw new CodeError(`"${b}" is not a ${controller} button. Valid: ${D.BUTTON_ORDER[controller].join(", ")}`);
      }
      if (total & table[key]) throw new CodeError(`Button "${b}" is listed twice.`);
      total |= table[key];
    }
    if (!total) throw new CodeError("Pick at least one button.");
    if (controller === "gcn") total += 0x0080;   // the thread's "add 0x80 to the Wavebird sum" rule
    return total;
  }

  function parseAddress(text) {
    const s = String(text || "").trim().toUpperCase().replace(/^0X/, "");
    return /^80[0-9A-F]{6}$/.test(s) ? parseInt(s, 16) : null;
  }

  // ------------------------------------------------------------- activators
  function buttonActivator(region, controller, slot, buttons, mode = "atleast") {
    const r = D.REGIONS[normRegion(region)];
    controller = normController(controller);
    const addr = addrOf(r.hi, r[controller][slotIndex(slot)]);
    const z = buttonValue(controller, buttons);
    let y;
    if (mode === "exact") y = 0x0000;              // these buttons and nothing else
    else if (mode === "atleast") y = 0xFFFF - z;   // these buttons, anything else ignored
    else throw new CodeError('Mode must be "exact" or "atleast".');
    return [line(0x28, addr, y * 0x10000 + z)];
  }

  function shakeActivator(region, device, slot) {
    const r = D.REGIONS[normRegion(region)];
    const key = { remote: "shakeRemote", nunchuk: "shakeNunchuk" }[device];
    if (!key) throw new CodeError('Shake device must be "remote" or "nunchuk".');
    return [line(0x24, addrOf(r.hi, r[key][slotIndex(slot)]), D.FLOAT_SHAKE)];
  }

  function tiltActivator(region, orientation) {
    const r = D.REGIONS[normRegion(region)];
    const type = { vertical: 0x24, sideways: 0x26 }[orientation];
    if (!type) throw new CodeError('Tilt must be "vertical" or "sideways".');
    return [line(type, addrOf(r.hi, r.tilt), D.FLOAT_TILT)];   // first remote only
  }

  /** GCN control stick / C-stick: 16-bit read of [X][Y], masking off the other byte. */
  function stickActivator(region, port, stick, direction) {
    const r = D.REGIONS[normRegion(region)];
    const s = D.STICK[stick];
    if (!s) throw new CodeError('Stick must be "main" or "c".');
    const addr = r.gcnPad + 8 * slotIndex(port) + s.offset;
    switch (String(direction).toLowerCase()) {
      case "right": return [line(0x2C, addr, 0x00FF0000 + s.hi * 0x100)];
      case "left":  return [line(0x2E, addr, 0x00FF0000 + s.lo * 0x100)];
      case "up":    return [line(0x2C, addr, 0xFF000000 + s.hi)];
      case "down":  return [line(0x2E, addr, 0xFF000000 + s.lo)];
      default: throw new CodeError("Direction must be up/down/left/right.");
    }
  }

  function activatorFromSpec(region, spec) {
    const type = spec.type || "buttons";
    switch (type) {
      case "buttons":
        return buttonActivator(region, spec.controller, spec.slot ?? 1, spec.buttons || [], spec.mode || "atleast");
      case "shake":
        return shakeActivator(region, spec.device || "remote", spec.slot ?? 1);
      case "tilt":
        return tiltActivator(region, spec.orientation);
      case "stick":
        return stickActivator(region, spec.port ?? 1, spec.stick || "main", spec.direction);
      default:
        throw new CodeError(`Unknown activator type "${type}".`);
    }
  }

  // ------------------------------------------------------ wrapping user code
  const LINE_RE = /^[0-9A-Fa-f]{8}\s+[0-9A-Fa-f]{8}$/;

  function parseCode(text) {
    const lines = [];
    const warnings = new Set();
    for (const raw of String(text || "").replace(/;/g, "\n").split(/\r?\n/)) {
      const s = raw.trim();
      if (!s || s.startsWith("#") || s.startsWith("*") || s.startsWith("$")) continue;
      const n = s.replace(/\s+/g, " ");
      if (!LINE_RE.test(n)) throw new CodeError(`Bad code line "${s}" (expected XXXXXXXX YYYYYYYY).`);
      lines.push(n.toUpperCase());
    }
    while (lines.length && lines[lines.length - 1] === D.TERMINATOR) lines.pop();   // we add our own
    lines.forEach((l, i) => {
      if (l.startsWith("E0000000")) {
        warnings.add(`Line ${i + 1} is a full terminator mid-code; lines after it run without the activator.`);
      }
      if (l.startsWith("C2") || l.startsWith("C3")) {
        warnings.add("Contains a C2 insert-ASM code: once hooked it stays active after the buttons are released.");
      }
    });
    return { lines, warnings: [...warnings].sort() };
  }

  function buildEntry(region, entry) {
    const specs = entry.activators && entry.activators.length
      ? entry.activators
      : (entry.activator ? [entry.activator] : []);
    if (!specs.length) throw new CodeError("Add at least one activator condition.");
    let out = [];
    for (const spec of specs) out = out.concat(activatorFromSpec(region, spec));  // stacked = all must be true
    const { lines: body, warnings } = parseCode(entry.code);
    if (!body.length) warnings.push("No code lines given; output is the activator only.");
    return { lines: [...out, ...body, D.TERMINATOR], warnings };
  }

  /** Plain code list: a $title line, the code lines, a blank line per entry. */
  function toTxt(entries) {
    const parts = [];
    for (const { title, lines } of entries) parts.push(`$${title}`, ...lines, "");
    return parts.join("\n");
  }

  // ------------------------------------------- Classic Controller remapper
  //   li     r3, 0          38600000   start with no buttons
  //   andi.  r4, r0, SRC    7004SSSS   raw button pressed?
  //   beq    +8             41820008   no -> skip
  //   ori    r3, r3, DST    6063DDDD   yes -> press the target bit(s)
  //   ...
  //   mr     r0, r3         7C601B78
  //   sth    r0, 0x2A(r29)  B01D002A   store remapped buttons
  const LI_R0_0 = 0x38000000;

  /** mapping: { SOURCE: [targets] } - an empty list disables the button. */
  function remapAsm(mapping) {
    const table = D.BUTTONS.classic;
    const words = [0x38600000];
    for (const src of D.REMAP_ORDER) {
      const dst = mapping[src] || [src];
      if (!dst.length) continue;                                  // button disabled
      const bits = dst.reduce((acc, b) => acc | table[b], 0);
      words.push(0x70040000 | table[src], 0x41820008, 0x60630000 | bits);
    }
    words.push(0x7C601B78, 0xB01D002A);
    if (words.length % 2) words.push(0x00000000);
    else words.push(0x60000000, 0x00000000);
    return words;
  }

  function remapCode(hooks, mapping, disableAnalog = true) {
    const lines = [];
    if (disableAnalog) for (const a of hooks.analog) lines.push(line(0x04, a, LI_R0_0));
    const words = remapAsm(mapping);
    lines.push(line(0xC2, hooks.hook, words.length / 2));
    for (let i = 0; i < words.length; i += 2) lines.push(`${hex(words[i])} ${hex(words[i + 1])}`);
    return lines;
  }

  const isChanged = (mapping, b) => {
    const dst = mapping[b] || [b];
    return !(dst.length === 1 && dst[0] === b);
  };

  function remapTxt(mapping, lines, disableAnalog) {
    const changed = D.REMAP_ORDER.filter((b) => isChanged(mapping, b));
    const out = ["$Classic Controller Custom Button Remap", "$Mappings applied:"];
    for (const src of changed) {
      const dst = mapping[src];
      out.push(`$  ${src.padEnd(5)} -> ${dst.length ? dst.join("+") : "DISABLED"}`);
    }
    if (!changed.length) out.push("$  (none - every button keeps its normal function)");
    out.push("$All other buttons keep their normal functions.");
    if (disableAnalog) out.push("$First two lines disable analog L/R shoulder data.");
    return [...out, "", ...lines, ""].join("\n");
  }

  function touchesShoulders(mapping) {
    const shoulders = ["L", "R", "ZL", "ZR"];
    return shoulders.some((b) => isChanged(mapping, b)) ||
      Object.values(mapping).some((dst) => dst.some((t) => t === "L" || t === "R"));
  }

  // --------------------------------------------------------- reference sheet
  function referenceEntries(region, mode = "atleast") {
    const key = normRegion(region);
    const names = { classic: "Classic Controller", wheel: "Wii Wheel/Nunchuk", gcn: "GCN Port" };
    const entries = [];
    for (const ctrl of D.CONTROLLER_ORDER) {
      for (let slot = 1; slot <= 4; slot++) {
        for (const b of D.BUTTON_ORDER[ctrl]) {
          entries.push({ title: `[${key}] ${names[ctrl]} ${slot} - ${b} (${mode})`,
                         lines: buttonActivator(key, ctrl, slot, [b], mode) });
        }
      }
    }
    for (let slot = 1; slot <= 4; slot++) {
      entries.push({ title: `[${key}] Wii Remote ${slot} shake`, lines: shakeActivator(key, "remote", slot) });
      entries.push({ title: `[${key}] Nunchuk ${slot} shake`, lines: shakeActivator(key, "nunchuk", slot) });
    }
    for (const o of ["vertical", "sideways"]) {
      entries.push({ title: `[${key}] Wii Remote 1 held ${o}`, lines: tiltActivator(key, o) });
    }
    for (let port = 1; port <= 4; port++) {
      for (const stick of ["main", "c"]) {
        for (const d of ["up", "down", "left", "right"]) {
          entries.push({ title: `[${key}] GCN Port ${port} ${stick}-stick ${d}`,
                         lines: stickActivator(key, port, stick, d) });
        }
      }
    }
    return entries;
  }

  function referenceText(region, mode) {
    const header = "# Activators only: put your code lines under the activator and end with\n" +
                   `# ${D.TERMINATOR}\n\n`;
    return header + toTxt(referenceEntries(region, mode));
  }

  // -------------------------------------------------------------- table check
  /** Compare the forum tables with the struct offsets every region otherwise shares. */
  function checkTables() {
    const issues = [];
    for (const key of D.REGION_ORDER) {
      const r = D.REGIONS[key];
      for (let i = 0; i < 4; i++) {
        const w = r.wheel[i];
        if (i && w - r.wheel[i - 1] !== D.KPAD_STRIDE) {
          issues.push({ region: key, field: "wheel", slot: i + 1, actual: w, predicted: r.wheel[i - 1] + D.KPAD_STRIDE });
        }
        for (const [field, off] of Object.entries(D.OFFSETS)) {
          if (r[field][i] !== w + off) {
            issues.push({ region: key, field, slot: i + 1, actual: r[field][i], predicted: w + off });
          }
        }
      }
      if (r.tilt !== r.wheel[0] + D.OFF_TILT) {
        issues.push({ region: key, field: "tilt", slot: 1, actual: r.tilt, predicted: r.wheel[0] + D.OFF_TILT });
      }
    }
    return issues;
  }

  MKW.codegen = {
    CodeError, hex, line, normRegion, normController, normButton, slotIndex,
    buttonValue, parseAddress,
    buttonActivator, shakeActivator, tiltActivator, stickActivator, activatorFromSpec,
    parseCode, buildEntry, toTxt,
    remapAsm, remapCode, remapTxt, touchesShoulders, isChanged,
    referenceEntries, referenceText, checkTables,
  };
})(globalThis.MKW = globalThis.MKW || {});
