// Run with:  node tests/codegen.test.js
// Checks the generator against known-good codes (no browser needed).
"use strict";
const assert = require("node:assert/strict");
require("../js/data.js");
require("../js/codegen.js");
const { data: D, codegen: G } = globalThis.MKW;

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL ${name}\n${e.message}`); process.exitCode = 1; }
}

const codeLines = (text) => text.split("\n").filter((l) => /^[0-9A-F]{8} [0-9A-F]{8}$/.test(l));

test("remapper reproduces the known NTSC-U layout exactly", () => {
  const mapping = Object.fromEntries(D.REMAP_ORDER.map((b) => [b, [b]]));
  Object.assign(mapping, D.EXAMPLE_REMAP);
  const lines = G.remapCode(D.REMAP_HOOKS["NTSC-U"], mapping, true);
  assert.deepEqual(lines, [
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

test("disabling a button shortens the C2 block and pads correctly", () => {
  const mapping = Object.fromEntries(D.REMAP_ORDER.map((b) => [b, [b]]));
  mapping.HOME = [];
  mapping.X = ["A", "B"];
  const lines = G.remapCode(D.REMAP_HOOKS["NTSC-U"], mapping, false);
  assert.equal(lines[0], "C21C87E4 00000017");
  assert.ok(lines.includes("41820008 60630050"));          // X -> A+B
  assert.equal(lines[lines.length - 1], "B01D002A 00000000");
});

test("button activators match the forum formulas", () => {
  assert.deepEqual(G.buttonActivator("NTSC-U", "classic", 1, ["L", "R"]), ["283414C2 DDFF2200"]);
  assert.deepEqual(G.buttonActivator("NTSC-U", "classic", 1, ["L", "PLUS"]), ["283414C2 DBFF2400"]);
  assert.deepEqual(G.buttonActivator("NTSC-U", "ccp", 1, ["ZL", "ZR"], "exact"), ["283414C2 00000084"]);
  assert.deepEqual(G.buttonActivator("PAL", "gcn", 1, ["A"]), ["28348200 FE7F0180"]);
  assert.deepEqual(G.buttonActivator("NTSC-U", "gcn", 1, ["A", "B"], "exact"), ["28343E80 00000380"]);
  assert.deepEqual(G.buttonActivator("NTSC-U", "gcn", 1, ["START"]), ["28343E80 EF7F1080"]);
  assert.deepEqual(G.buttonActivator("NTSC-U", "wheel", 1, ["+", "-"]), ["28341462 EFEF1010"]);
  assert.deepEqual(G.buttonActivator("NTSC-K", "classic", 4, ["A"]), ["283347EA FFEF0010"]);
});

test("shake, tilt and stick activators", () => {
  assert.deepEqual(G.shakeActivator("NTSC-U", "remote", 1), ["24341478 40000000"]);
  assert.deepEqual(G.tiltActivator("PAL", "sideways"), ["263457F4 BF735000"]);
  assert.deepEqual(G.stickActivator("NTSC-U", 1, "c", "up"), ["2C34C204 FF0000C2"]);
  assert.deepEqual(G.stickActivator("NTSC-U", 2, "main", "left"), ["2E34C20A 00FF4200"]);
});

test("code list wraps codes and adds the terminator", () => {
  const { lines, warnings } = G.buildEntry("NTSC-U", {
    activators: [{ type: "buttons", controller: "gcn", slot: 1, buttons: ["Y"] },
                 { type: "stick", port: 1, stick: "c", direction: "up" }],
    code: "04123456 00000001\nE0000000 80008000",
  });
  assert.deepEqual(lines, ["28343E80 F77F0880", "2C34C204 FF0000C2", "04123456 00000001", "E0000000 80008000"]);
  assert.deepEqual(warnings, []);
  assert.equal(G.toTxt([{ title: "T", lines: ["A"] }]), "$T\nA\n");
});

test("bad input raises a readable error", () => {
  assert.throws(() => G.buttonActivator("NTSC-U", "classic", 1, ["Q"]), /not a classic button/);
  assert.throws(() => G.buttonActivator("NTSC-U", "classic", 1, []), /at least one button/);
  assert.throws(() => G.parseCode("1234 5678"), /Bad code line/);
  assert.throws(() => G.normRegion("Mars"), /Unknown version/);
});

test("reference sheet has every activator", () => {
  assert.equal(G.referenceEntries("NTSC-U").length, (15 + 13 + 12) * 4 + 8 + 2 + 32);
});

test("table check flags the 11 suspected forum typos", () => {
  assert.equal(G.checkTables().length, 11);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
