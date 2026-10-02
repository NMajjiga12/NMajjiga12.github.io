/*
 * check.js - "Table check" tab: compares the forum's address tables with the
 * struct layout every version otherwise follows, to flag likely typos.
 */
(function (MKW) {
  "use strict";
  const { data: D, codegen: G, dom } = MKW;
  const { el } = dom;

  const FIELD_NAMES = {
    wheel: "Wii Wheel/Nunchuk buttons",
    classic: "Classic Controller buttons",
    shakeRemote: "Wii Remote shake",
    shakeNunchuk: "Nunchuk shake",
    tilt: "Wii Remote tilt",
  };

  function initCheck() {
    const issues = G.checkTables();
    const summary = document.getElementById("check-summary");
    const body = document.getElementById("check-body");

    summary.textContent = issues.length
      ? `${issues.length} values in the forum tables don't fit the pattern. The generator keeps the forum's values, so test activators that use them before relying on them.`
      : "Every value in the forum tables fits the pattern.";

    body.replaceChildren(...issues.map((x) => el("tr", null,
      el("td", null, D.REGIONS[x.region].label),
      el("td", null, `${FIELD_NAMES[x.field] || x.field}, player ${x.slot}`),
      el("td", { class: "mono" }, G.hex(x.actual, 4)),
      el("td", { class: "mono" }, G.hex(x.predicted, 4)))));
  }

  MKW.initCheck = initCheck;
})(globalThis.MKW = globalThis.MKW || {});
