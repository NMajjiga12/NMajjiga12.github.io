/*
 * codegen.js - builds the Classic Controller remapper (no DOM; also runs in Node).
 *
 * One block per source button inside a C2 insert-ASM code:
 *   li     r3, 0          38600000   start with no buttons
 *   andi.  r4, r0, SRC    7004SSSS   raw button pressed?
 *   beq    +8             41820008   no -> skip
 *   ori    r3, r3, DST    6063DDDD   yes -> press the target bit(s)
 *   ...
 *   mr     r0, r3         7C601B78
 *   sth    r0, 0x2A(r29)  B01D002A   store the remapped buttons
 * The optional 04 lines write "li r0, 0" over the analog L/R reads.
 */
(function (MKW) {
  "use strict";
  const { BITS, ORDER } = MKW.data;

  const hex = (n) => (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
  // Gecko line with ba = 0x80000000: code type + low 25 bits of the address
  const line = (type, addr, value) => `${hex(type * 0x1000000 + (addr & 0x01FFFFFF))} ${hex(value)}`;

  function parseAddress(text) {
    const s = String(text || "").trim().toUpperCase().replace(/^0X/, "");
    return /^80[0-9A-F]{6}$/.test(s) ? parseInt(s, 16) : null;
  }

  const isChanged = (m, b) => m[b].length !== 1 || m[b][0] !== b;

  /** True when a shoulder button is remapped, or another button now acts as L or R. */
  const touchesShoulders = (m) => ORDER.some((b) =>
    isChanged(m, b) && (["L", "R", "ZL", "ZR"].includes(b) || m[b].includes("L") || m[b].includes("R")));

  /** mapping: { SOURCE: [targets] } with every button present; [] disables a button. */
  function remapLines(hooks, m, disableAnalog) {
    const words = [0x38600000];
    for (const src of ORDER) {
      if (!m[src].length) continue;
      const bits = m[src].reduce((acc, b) => acc | BITS[b], 0);
      words.push(0x70040000 | BITS[src], 0x41820008, 0x60630000 | bits);
    }
    words.push(0x7C601B78, 0xB01D002A);
    words.push(...(words.length % 2 ? [0] : [0x60000000, 0]));   // pad to whole lines

    const lines = disableAnalog ? hooks.analog.map((a) => line(0x04, a, 0x38000000)) : [];
    lines.push(line(0xC2, hooks.hook, words.length / 2));
    for (let i = 0; i < words.length; i += 2) lines.push(`${hex(words[i])} ${hex(words[i + 1])}`);
    return lines;
  }

  /** The full .txt: $ comment header listing the changes, then the code lines. */
  function remapText(hooks, m, disableAnalog) {
    const changed = ORDER.filter((b) => isChanged(m, b));
    const head = ["$Classic Controller Custom Button Remap", "$Mappings applied:"];
    for (const b of changed) head.push(`$  ${b.padEnd(5)} -> ${m[b].length ? m[b].join("+") : "DISABLED"}`);
    if (!changed.length) head.push("$  (none - every button keeps its normal function)");
    head.push("$All other buttons keep their normal functions.");
    if (disableAnalog) head.push("$First two lines disable analog L/R shoulder data.");
    return [...head, "", ...remapLines(hooks, m, disableAnalog), ""].join("\n");
  }

  MKW.codegen = { parseAddress, isChanged, touchesShoulders, remapLines, remapText };
})(globalThis.MKW = globalThis.MKW || {});
