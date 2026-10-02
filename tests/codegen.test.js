// Run with:  node tests/codegen.test.js
"use strict";
const assert = require("node:assert/strict");
require("../js/data.js");
require("../js/codegen.js");
const { data: D, codegen: G } = globalThis.MKW;

const base = () => Object.fromEntries(D.ORDER.map((b) => [b, [b]]));
const hooks = D.HOOKS["NTSC-U"];
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`  FAIL ${name}\n${e.message}`); }
}

test("reproduces the known NTSC-U remap exactly", () => {
  assert.deepEqual(G.remapLines(hooks, { ...base(), ...D.EXAMPLE }, true), [
    "041C87C0 38000000", "041C87CC 38000000", "C21C87E4 00000019",
    "38600000 70040800", "41820008 60630800", "70040001 41820008",
    "60630001 70044000", "41820008 60634000", "70040002 41820008",
    "60630002 70048000", "41820008 60638000", "70040010 41820008",
    "60630010 70040040", "41820008 60630040", "70040008 41820008",
    "60630001 70040020", "41820008 60634000", "70042000 41820008",
    "60630002 70040200", "41820008 60630004", "70040080 41820008",
    "60632000 70040004", "41820008 60630200", "70040400 41820008",
    "60630400 70041000", "41820008 60631000", "7C601B78 B01D002A",
    "60000000 00000000",
  ]);
});

test("a disabled button shortens the block; a combo ORs the bits", () => {
  const lines = G.remapLines(hooks, { ...base(), HOME: [], X: ["A", "B"] }, false);
  assert.equal(lines[0], "C21C87E4 00000017");
  assert.ok(lines.includes("41820008 60630050"));
  assert.equal(lines.at(-1), "B01D002A 00000000");
});

test("analog option only suggested when shoulders are involved", () => {
  assert.equal(G.touchesShoulders(base()), false);
  assert.equal(G.touchesShoulders({ ...base(), A: ["B"] }), false);
  assert.equal(G.touchesShoulders({ ...base(), ZL: ["L"] }), true);
  assert.equal(G.touchesShoulders({ ...base(), A: ["R"] }), true);
});

test("header lists only the changed buttons", () => {
  const text = G.remapText(hooks, { ...base(), HOME: [], X: ["UP"] }, false);
  assert.match(text, /\$  HOME  -> DISABLED\n\$  X     -> UP\n\$All other/);
  assert.doesNotMatch(text, /analog/);
});

test("hook addresses are validated", () => {
  assert.equal(G.parseAddress("0x801c87e4"), 0x801C87E4);
  assert.equal(G.parseAddress("1C87E4"), null);
});

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exitCode = failed ? 1 : 0;
