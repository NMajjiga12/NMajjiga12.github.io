/* data.js - versions, Classic Controller button bits and remapper hook addresses. */
(function (MKW) {
  "use strict";

  MKW.data = {
    REGIONS: [
      ["NTSC-U", "NTSC-U (USA)"],
      ["PAL", "PAL (Europe/Australia)"],
      ["NTSC-J", "NTSC-J (Japan)"],
      ["NTSC-K", "NTSC-K (Korea)"],
      ["JPN-DEMO", "JPN Demo"],
    ],
    CONTROLLERS: [
      ["classic", "Classic Controller / Classic Controller Pro"],
      ["wheel", "Wii Wheel / Wii Remote + Nunchuk"],
      ["gcn", "GameCube Controller / Wavebird"],
    ],

    // Classic Controller button bits (from the mkwii.com controller thread)
    BITS: {
      UP: 0x0001, LEFT: 0x0002, ZR: 0x0004, X: 0x0008, A: 0x0010, Y: 0x0020,
      B: 0x0040, ZL: 0x0080, R: 0x0200, PLUS: 0x0400, HOME: 0x0800,
      MINUS: 0x1000, L: 0x2000, DOWN: 0x4000, RIGHT: 0x8000,
    },
    // Order the remapper checks buttons in (also the on-screen order)
    ORDER: ["HOME", "UP", "DOWN", "LEFT", "RIGHT", "A", "B", "X", "Y", "L", "R", "ZL", "ZR", "PLUS", "MINUS"],

    LABELS: {
      UP: "D-Pad Up", DOWN: "D-Pad Down", LEFT: "D-Pad Left", RIGHT: "D-Pad Right",
      PLUS: "Plus (+)", MINUS: "Minus (−)", HOME: "Home",
    },
    SHORT: { UP: "Up", DOWN: "Down", LEFT: "Left", RIGHT: "Right", PLUS: "+", MINUS: "−" },

    // __parse_cl_data hook (C2) and the two analog L/R writes (04) per version
    HOOKS: {
      "NTSC-U": { hook: 0x801C87E4, analog: [0x801C87C0, 0x801C87CC] },
    },

    EXAMPLE: { X: ["UP"], Y: ["DOWN"], L: ["LEFT"], R: ["ZR"], ZL: ["L"], ZR: ["R"] },
  };
})(globalThis.MKW = globalThis.MKW || {});
