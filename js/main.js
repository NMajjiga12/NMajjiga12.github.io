/*
 * main.js - tab switching and start-up.
 */
(function (MKW) {
  "use strict";

  function initTabs() {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const panelOf = (tab) => document.getElementById(tab.getAttribute("aria-controls"));

    function select(tab, { focus = false, updateHash = true } = {}) {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        panelOf(t).hidden = !on;
      }
      if (focus) tab.focus();
      if (updateHash) history.replaceState(null, "", `#${tab.dataset.tab}`);
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (step) {
          e.preventDefault();
          select(tabs[(i + step + tabs.length) % tabs.length], { focus: true });
        } else if (e.key === "Home" || e.key === "End") {
          e.preventDefault();
          select(tabs[e.key === "Home" ? 0 : tabs.length - 1], { focus: true });
        }
      });
    });

    const fromHash = () => tabs.find((t) => `#${t.dataset.tab}` === location.hash) || tabs[0];
    select(fromHash(), { updateHash: false });
    window.addEventListener("hashchange", () => select(fromHash(), { updateHash: false }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    MKW.initRemap();
    MKW.initActivators();
    MKW.initReference();
    MKW.initCheck();
  });
})(globalThis.MKW = globalThis.MKW || {});
