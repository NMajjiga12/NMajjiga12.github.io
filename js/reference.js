/*
 * reference.js - "Reference sheet" tab: every activator for one version.
 */
(function (MKW) {
  "use strict";
  const { data: D, codegen: G, dom } = MKW;

  function initReference() {
    const $ = (id) => document.getElementById(id);
    const regionSel = $("ref-region");
    const modeSel = $("ref-mode");
    const out = $("ref-output");
    const countPill = $("ref-count");
    const fileInput = $("ref-filename");
    const copyBtn = $("ref-copy");
    const dlBtn = $("ref-download");
    let text = "";
    let lastAuto = "";

    dom.fillSelect(regionSel, D.REGION_ORDER.map((k) => [k, D.REGIONS[k].label]), "NTSC-U");

    function refresh() {
      text = G.referenceText(regionSel.value, modeSel.value);
      dom.renderCode(out, text);
      countPill.textContent = `${G.referenceEntries(regionSel.value, modeSel.value).length} activators`;
      // Follow the selection with the filename unless the user typed their own
      const auto = `activators_${regionSel.value}_${modeSel.value}.txt`;
      if (!fileInput.value || fileInput.value === lastAuto) fileInput.value = auto;
      lastAuto = auto;
    }

    regionSel.addEventListener("change", refresh);
    modeSel.addEventListener("change", refresh);
    copyBtn.addEventListener("click", () => dom.copyText(text, copyBtn));
    dlBtn.addEventListener("click", () => dom.downloadText(dom.safeFilename(fileInput.value, "activators.txt"), text));
    refresh();
  }

  MKW.initReference = initReference;
})(globalThis.MKW = globalThis.MKW || {});
