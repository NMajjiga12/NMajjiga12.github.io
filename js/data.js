/*
 * data.js - address tables, button values and constants.
 *
 * Source: mkwii.com "Controller Address & Button (X,Y,Z) Values" thread.
 * `hi` is the upper half of every address; the XXXX values are the lower half.
 */
(function (MKW) {
  "use strict";

  const REGIONS = {
    "NTSC-U": {
      label: "NTSC-U (USA)", gameId: "RMCE01", hi: 0x8034,
      wheel:        [0x1462, 0x199A, 0x1ED2, 0x240A],
      classic:      [0x14C2, 0x19FA, 0x1F32, 0x246A],
      gcn:          [0x3E80, 0x3E8C, 0x3E98, 0x3EA4],
      shakeRemote:  [0x1478, 0x19B0, 0x1EE8, 0x2420],
      shakeNunchuk: [0x14D4, 0x1A0C, 0x1F44, 0x247C],
      tilt: 0x1474, gcnPad: 0x8034C200,
    },
    "PAL": {
      label: "PAL (Europe/Australia)", gameId: "RMCP01", hi: 0x8034,
      wheel:        [0x57E2, 0x5D1A, 0x6252, 0x678A],
      classic:      [0x5842, 0x5D7A, 0x62B2, 0x67EA],
      gcn:          [0x8200, 0x820C, 0x8218, 0x8224],
      shakeRemote:  [0x57F8, 0x5D30, 0x6268, 0x67A0],
      shakeNunchuk: [0x5854, 0x5D8C, 0x62C4, 0x67FC],
      tilt: 0x57F4, gcnPad: 0x80350580,
    },
    "NTSC-J": {
      label: "NTSC-J (Japan)", gameId: "RMCJ01", hi: 0x8034,
      wheel:        [0x5162, 0x569A, 0x5BD2, 0x610A],
      classic:      [0x51C2, 0x56FA, 0x5C32, 0x616A],
      gcn:          [0x7B80, 0x7B8C, 0x7B98, 0x7BA4],
      shakeRemote:  [0x5178, 0x56B4, 0x5BEC, 0x6124],
      shakeNunchuk: [0x51D4, 0x570C, 0x5C44, 0x617C],
      tilt: 0x5174, gcnPad: 0x8034FF00,
    },
    "NTSC-K": {
      label: "NTSC-K (Korea)", gameId: "RMCK01", hi: 0x8033,
      wheel:        [0x37E2, 0x3D1A, 0x4252, 0x478A],
      classic:      [0x3842, 0x3D7A, 0x42B2, 0x47EA],
      gcn:          [0x6200, 0x620C, 0x6218, 0x6224],
      shakeRemote:  [0x3834, 0x3D6C, 0x42A4, 0x47DC],
      shakeNunchuk: [0x3854, 0x3D8C, 0x42C4, 0x47FC],
      tilt: 0x37F4, gcnPad: 0x8033E580,
    },
    "JPN-DEMO": {
      label: "JPN Demo", gameId: null, hi: 0x8034,
      wheel:        [0x4E62, 0x539A, 0x58D2, 0x5E0A],
      classic:      [0x4EC2, 0x53FA, 0x5932, 0x5E6A],
      gcn:          [0x7880, 0x788C, 0x7898, 0x78A4],
      shakeRemote:  [0x4E78, 0x53B0, 0x58E8, 0x5E20],
      shakeNunchuk: [0x4EC0, 0x53F8, 0x5930, 0x5E68],
      tilt: 0x4E74, gcnPad: 0x8034FC00,
    },
  };
  const REGION_ORDER = ["NTSC-U", "PAL", "NTSC-J", "NTSC-K", "JPN-DEMO"];
  const REGION_ALIASES = {
    USA: "NTSC-U", US: "NTSC-U", E: "NTSC-U", RMCE: "NTSC-U", RMCE01: "NTSC-U",
    EUR: "PAL", P: "PAL", RMCP: "PAL", RMCP01: "PAL",
    JPN: "NTSC-J", J: "NTSC-J", RMCJ: "NTSC-J", RMCJ01: "NTSC-J",
    KOR: "NTSC-K", K: "NTSC-K", RMCK: "NTSC-K", RMCK01: "NTSC-K",
    DEMO: "JPN-DEMO", JPND: "JPN-DEMO",
  };

  // Button bit values (ZZZZ), kept as ordered lists because "1"/"2" would
  // otherwise be re-ordered by JavaScript object key rules.
  const BUTTON_LIST = {
    classic: [["UP", 0x0001], ["LEFT", 0x0002], ["ZR", 0x0004], ["X", 0x0008],
              ["A", 0x0010], ["Y", 0x0020], ["B", 0x0040], ["ZL", 0x0080],
              ["R", 0x0200], ["PLUS", 0x0400], ["HOME", 0x0800], ["MINUS", 0x1000],
              ["L", 0x2000], ["DOWN", 0x4000], ["RIGHT", 0x8000]],
    wheel:   [["LEFT", 0x0001], ["RIGHT", 0x0002], ["DOWN", 0x0004], ["UP", 0x0008],
              ["PLUS", 0x0010], ["2", 0x0100], ["1", 0x0200], ["B", 0x0400],
              ["A", 0x0800], ["MINUS", 0x1000], ["Z", 0x2000], ["C", 0x4000],
              ["HOME", 0x8000]],
    // Wavebird bits; a wired GCN controller adds the constant 0x0080 bit
    gcn:     [["LEFT", 0x0001], ["RIGHT", 0x0002], ["DOWN", 0x0004], ["UP", 0x0008],
              ["Z", 0x0010], ["R", 0x0020], ["L", 0x0040], ["A", 0x0100],
              ["B", 0x0200], ["X", 0x0400], ["Y", 0x0800], ["START", 0x1000]],
  };
  const BUTTON_ORDER = {};
  const BUTTONS = {};
  for (const [ctrl, list] of Object.entries(BUTTON_LIST)) {
    BUTTON_ORDER[ctrl] = list.map(([name]) => name);
    BUTTONS[ctrl] = Object.fromEntries(list);
  }

  // Only applied when the typed name is not already a button on that controller
  const BUTTON_ALIASES = {
    "+": "PLUS", "-": "MINUS", "START": "PLUS", "SELECT": "MINUS",
    "Z(RIGHT)": "ZR", "Z(LEFT)": "ZL", "DPAD_UP": "UP", "DPAD_DOWN": "DOWN",
    "DPAD_LEFT": "LEFT", "DPAD_RIGHT": "RIGHT", "S": "START",
  };

  // Display names for the interface (the generated code uses the plain names)
  const LABELS = {
    UP: "D-Pad Up", DOWN: "D-Pad Down", LEFT: "D-Pad Left", RIGHT: "D-Pad Right",
    A: "A", B: "B", X: "X", Y: "Y", L: "L", R: "R", ZL: "ZL", ZR: "ZR",
    PLUS: "Plus (+)", MINUS: "Minus (−)", HOME: "Home",
    "1": "1", "2": "2", C: "C", Z: "Z", START: "Start",
  };
  const SHORT = {
    UP: "Up", DOWN: "Down", LEFT: "Left", RIGHT: "Right",
    PLUS: "+", MINUS: "−", HOME: "Home", START: "Start",
  };

  const CONTROLLERS = {
    classic: "Classic Controller / Classic Controller Pro",
    wheel: "Wii Wheel / Wii Remote + Nunchuk",
    gcn: "GameCube Controller / Wavebird",
  };
  const CONTROLLER_ORDER = ["classic", "wheel", "gcn"];
  const CONTROLLER_ALIASES = {
    cc: "classic", ccp: "classic", classic_pro: "classic",
    nunchuk: "wheel", nunchuck: "wheel", wiimote: "wheel", remote: "wheel",
    wii_wheel: "wheel", gc: "gcn", gamecube: "gcn", wavebird: "gcn",
  };

  // Gecko constants
  const TERMINATOR = "E0000000 80008000";
  const FLOAT_SHAKE = 0x40000000;   // 2.0f
  const FLOAT_TILT = 0xBF735000;    // about -0.95f

  // Stick thresholds from the thread (activate when pushed past these)
  const STICK = {
    main: { offset: 2, hi: 0xC8, lo: 0x42 },
    c:    { offset: 4, hi: 0xC2, lo: 0x50 },
  };

  // Per-controller block layout, relative to the Wii Wheel/Nunchuk button word
  const KPAD_STRIDE = 0x538;
  const OFFSETS = { classic: 0x60, shakeRemote: 0x16, shakeNunchuk: 0x72 };
  const OFF_TILT = 0x12;

  // Classic Controller remapper (__parse_cl_data hook)
  const REMAP_HOOKS = {
    "NTSC-U": { hook: 0x801C87E4, analog: [0x801C87C0, 0x801C87CC] },
  };
  const REMAP_ORDER = ["HOME", "UP", "DOWN", "LEFT", "RIGHT", "A", "B", "X", "Y",
                       "L", "R", "ZL", "ZR", "PLUS", "MINUS"];
  const EXAMPLE_REMAP = { X: ["UP"], Y: ["DOWN"], L: ["LEFT"], R: ["ZR"], ZL: ["L"], ZR: ["R"] };

  MKW.data = {
    REGIONS, REGION_ORDER, REGION_ALIASES,
    BUTTONS, BUTTON_ORDER, BUTTON_ALIASES, LABELS, SHORT,
    CONTROLLERS, CONTROLLER_ORDER, CONTROLLER_ALIASES,
    TERMINATOR, FLOAT_SHAKE, FLOAT_TILT, STICK,
    KPAD_STRIDE, OFFSETS, OFF_TILT,
    REMAP_HOOKS, REMAP_ORDER, EXAMPLE_REMAP,
  };
})(globalThis.MKW = globalThis.MKW || {});
