// World news of Wednesday 18 November 2026, summed up in one image.
// A newspaper-style front page, drawn entirely from code: no network, no
// downloaded assets, no copied image. Node 22, standard library only.
// Writes entry.png into /output (or $MAKEFUN_OUTPUT_DIR). Deterministic:
// fixed palette, fixed layout, fixed compression — two runs are byte-identical.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---- palette (flat, high contrast) ----
const PAPER: RGB = [248, 244, 233];
const PANEL: RGB = [255, 255, 255];
const INK: RGB = [17, 17, 17];
const RED: RGB = [178, 34, 34];
const BLUE: RGB = [29, 78, 216];
const GOLD: RGB = [176, 96, 16];
const GREEN: RGB = [21, 128, 61];
const GREY: RGB = [107, 114, 128];
const LIGHTBLUE: RGB = [191, 219, 254];
const LIGHTGOLD: RGB = [254, 243, 199];
const DARKBLUE: RGB = [30, 58, 95];
const ORANGE: RGB = [234, 88, 12];

type RGB = [number, number, number];

// ---- canvas ----
const px = new Uint8Array(W * H * 3);
function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}
function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) setPx(i, j, c);
  }
}
function hline(x: number, y: number, w: number, c: RGB): void {
  rect(x, y, w, 1, c);
}
function vline(x: number, y: number, h: number, c: RGB): void {
  rect(x, y, 1, h, c);
}
// Bresenham line
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const r = Math.floor(t / 2);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) line(x0 + dx, y0 + dy, x1 + dx, y1 + dy, c);
  }
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setPx(x, y, c);
    }
  }
}
function ring(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a++) {
    const t = (a * Math.PI) / 180;
    setPx(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges = [
      [x0, y0, x1, y1],
      [x1, y1, x2, y2],
      [x2, y2, x0, y0],
    ];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      const a = Math.ceil(Math.min(xs[0], xs[1]));
      const b = Math.floor(Math.max(xs[0], xs[1]));
      for (let x = a; x <= b; x++) setPx(x, y, c);
    }
  }
}

// ---- 5x7 bitmap font, written by hand (A-Z, 0-9, punctuation) ----
// Each glyph is 7 rows; each row is a 5-bit number, bit 4 = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
};

function drawChar(ch: string, x: number, y: number, s: number, c: RGB): void {
  const g = FONT[ch];
  if (!g) return;
  for (let row = 0; row < 7; row++) {
    const bits = g[row];
    for (let col = 0; col < 5; col++) {
      if (bits & (1 << (4 - col))) rect(x + col * s, y + row * s, s, s, c);
    }
  }
}
function textWidth(str: string, s: number): number {
  if (str.length === 0) return 0;
  return str.length * 6 * s - s;
}
function drawText(str: string, x: number, y: number, s: number, c: RGB): void {
  let cx = x;
  for (const ch of str) {
    drawChar(ch, cx, y, s, c);
    cx += 6 * s;
  }
}
function drawTextCentered(str: string, cx: number, y: number, s: number, c: RGB): void {
  drawText(str, cx - Math.floor(textWidth(str, s) / 2), y, s, c);
}
// Greedy word wrap; returns lines that fit maxW at scale s.
function wrap(text: string, maxW: number, s: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur === '' ? w : cur + ' ' + w;
    if (textWidth(next, s) <= maxW) {
      cur = next;
    } else {
      if (cur !== '') lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}
function drawBlock(lines: string[], x: number, y: number, s: number, c: RGB, lh: number): number {
  let cy = y;
  for (const ln of lines) {
    drawText(ln, x, cy, s, c);
    cy += lh;
  }
  return cy;
}

// ---- panels and pictograms ----
function panel(x: number, y: number, w: number, h: number, accent: RGB): void {
  rect(x, y, w, h, PANEL);
  rect(x, y, w, 6, accent);
  rect(x, y, w, 1, INK);
  rect(x, y + h - 1, w, 1, INK);
  rect(x, y, 1, h, INK);
  rect(x + w - 1, y, 1, h, INK);
}
function kicker(text: string, x: number, y: number, c: RGB): void {
  drawText(text, x, y, 2, c);
}

// Lead pictogram: Shenzhen skyline at dusk, three flags, rising sun.
function picLead(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHTBLUE);
  disc(x + w - 40, y + 34, 26, GOLD); // sun
  // skyline
  const base = y + h - 34;
  const towers: Array<[number, number, number]> = [
    [0, 96, 150],
    [52, 70, 110],
    [108, 118, 190],
    [170, 84, 130],
    [212, 126, 210],
    [262, 74, 120],
  ];
  for (const [tx, tw, th] of towers) {
    rect(x + tx, base - th + 34, tw, th, DARKBLUE);
    for (let wy = base - th + 46; wy < base + 20; wy += 18) {
      for (let wx = x + tx + 8; wx < x + tx + tw - 8; wx += 16) {
        rect(wx, wy, 5, 6, GOLD);
      }
    }
  }
  rect(x, y + h - 34, w, 34, [52, 90, 60]); // ground
  // three flag poles with flags
  const flags: Array<[number, RGB, string]> = [
    [x + 60, RED, 'C'],
    [x + 150, [255, 255, 255], 'R'],
    [x + 240, BLUE, 'U'],
  ];
  for (const [fx, fc] of flags) {
    vline(fx, y + h - 118, 84, INK);
    if (fc[0] === 255) {
      rect(fx + 1, y + h - 118, 44, 12, [255, 255, 255]);
      rect(fx + 1, y + h - 106, 44, 12, BLUE);
      rect(fx + 1, y + h - 94, 44, 12, RED);
    } else if (fc === RED) {
      rect(fx + 1, y + h - 118, 44, 36, RED);
      disc(fx + 12, y + h - 106, 4, GOLD);
      disc(fx + 24, y + h - 112, 2, GOLD);
      disc(fx + 30, y + h - 102, 2, GOLD);
    } else {
      rect(fx + 1, y + h - 118, 44, 36, [255, 255, 255]);
      for (let s = 0; s < 5; s++) rect(fx + 1, y + h - 118 + s * 7, 44, 3, RED);
      rect(fx + 1, y + h - 118, 20, 18, BLUE);
      disc(fx + 6, y + h - 113, 1, [255, 255, 255]);
      disc(fx + 14, y + h - 108, 1, [255, 255, 255]);
    }
  }
}

// US-Iran pictogram: missile and burst over a sea line.
function picMissile(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHTGOLD);
  rect(x, y + h - 22, w, 22, LIGHTBLUE); // sea
  hline(x, y + h - 22, w, BLUE);
  // missile rising
  const mx = x + 52;
  tri(mx - 12, y + 44, mx + 12, y + 44, mx, y + 18, GREY);
  rect(mx - 12, y + 44, 24, 44, GREY);
  tri(mx - 20, y + 88, mx - 12, y + 72, mx - 12, y + 88, RED);
  tri(mx + 20, y + 88, mx + 12, y + 72, mx + 12, y + 88, RED);
  tri(mx - 8, y + 88, mx + 8, y + 88, mx, y + 99, ORANGE);
  // burst
  const bx = x + w - 58;
  const by = y + 40;
  for (let a = 0; a < 8; a++) {
    const t = (a * Math.PI) / 4;
    line(bx, by, Math.round(bx + 22 * Math.cos(t)), Math.round(by + 22 * Math.sin(t)), ORANGE);
  }
  disc(bx, by, 10, RED);
  disc(bx, by, 5, GOLD);
}

// Kerch pictogram: bridge over water with a broken, collapsed span.
function picBridge(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHTBLUE);
  rect(x, y + h - 30, w, 30, BLUE); // water
  hline(x, y + h - 30, w, INK);
  // deck left and right, gap in the middle
  const dy = y + 52;
  rect(x + 8, dy, 74, 10, INK);
  rect(x + w - 82, dy, 74, 10, INK);
  // collapsed span tilted into the water
  thickLine(x + 86, dy + 4, x + w - 90, dy + 44, 8, GREY);
  // pillars
  rect(x + 20, dy + 10, 8, 34, INK);
  rect(x + w - 28, dy + 10, 8, 34, INK);
  // smoke
  disc(x + w / 2 - 6, y + 34, 12, GREY);
  disc(x + w / 2 + 12, y + 26, 9, GREY);
  disc(x + w / 2 + 2, y + 16, 7, [200, 200, 200]);
}

// Peltola pictogram: ballot box with a big check.
function picBallot(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHTGOLD);
  rect(x + 34, y + 44, 96, 52, BLUE); // box
  rect(x + 34, y + 44, 96, 10, DARKBLUE); // lid
  rect(x + 66, y + 48, 32, 4, PANEL); // slot
  thickLine(x + 44, y + 78, x + 64, y + 92, 7, GREEN);
  thickLine(x + 64, y + 92, x + 114, y + 58, 7, GREEN);
  // ballot slip going in
  rect(x + 58, y + 12, 46, 30, PANEL);
  rect(x + 58, y + 12, 46, 2, INK);
  rect(x + 58, y + 40, 46, 2, INK);
  rect(x + 64, y + 20, 22, 3, RED);
  rect(x + 64, y + 28, 30, 3, GREY);
}

// Voyager pictogram: probe on black space with stars and signal rings.
function picVoyager(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, [10, 10, 26]);
  const stars: Array<[number, number]> = [
    [12, 14],
    [40, 30],
    [96, 12],
    [150, 26],
    [190, 16],
    [30, 60],
    [170, 58],
    [120, 44],
  ];
  for (const [sx, sy] of stars) disc(x + sx, y + sy, 2, [255, 255, 255]);
  // dish + body + boom
  const cx = x + 100;
  const cy = y + 55;
  tri(cx - 30, cy - 16, cx + 30, cy - 16, cx, cy + 8, GOLD);
  rect(cx - 11, cy + 8, 22, 16, [200, 200, 200]);
  line(cx + 11, cy + 14, cx + 40, cy + 4, [200, 200, 200]);
  disc(cx + 44, cy + 2, 4, RED);
  ring(cx, cy, 32, GOLD);
  ring(cx, cy, 42, [255, 255, 255]);
}

// Measles pictogram: red virus ball with spikes.
function picVirus(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, [254, 226, 226]);
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  for (let a = 0; a < 10; a++) {
    const t = (a * Math.PI) / 5;
    line(cx, cy, Math.round(cx + 44 * Math.cos(t)), Math.round(cy + 44 * Math.sin(t)), RED);
    disc(Math.round(cx + 44 * Math.cos(t)), Math.round(cy + 44 * Math.sin(t)), 4, RED);
  }
  disc(cx, cy, 38, RED);
  disc(cx - 12, cy - 10, 6, [255, 255, 255]);
  disc(cx + 12, cy + 12, 5, [255, 255, 255]);
  disc(cx + 14, cy - 14, 4, [255, 255, 255]);
}

// ---- layout: a newspaper front page ----
fill(PAPER);

// Masthead
drawTextCentered('WORLD NEWS', 512, 36, 10, INK);
rect(28, 118, 968, 3, INK);
drawTextCentered('WEDNESDAY 18 NOVEMBER 2026', 512, 132, 3, RED);
rect(28, 160, 968, 3, INK);
rect(28, 166, 968, 1, INK);

// Lead story: Xi, Putin and Trump in Shenzhen
panel(28, 178, 968, 252, RED);
kicker('APEC SUMMIT - SHENZHEN, CHINA', 48, 196, RED);
drawText('XI AND PUTIN MEET', 48, 224, 5, INK);
drawText('TRUMP JOINS NEXT', 48, 268, 5, INK);
rect(48, 312, 120, 4, RED);
drawBlock(
  wrap(
    'XI JINPING AND VLADIMIR PUTIN MET IN SHENZHEN AHEAD OF A TRILATERAL WITH DONALD TRUMP ON THURSDAY. TRUMP FLEW IN FROM MANILA, WHERE THE QUAD MET AT LEADER LEVEL FOR THE FIRST TIME IN OVER TWO YEARS.',
    560,
    2,
  ),
  48,
  328,
  2,
  INK,
  18,
);
picLead(640, 196, 336, 216);

// Row A: three panels
const rowAY = 446;
const rowAH = 230;
function storyPanel3(
  x: number,
  kick: string,
  head1: string,
  head2: string,
  summary: string,
  accent: RGB,
  pic: (x: number, y: number, w: number, h: number) => void,
): void {
  panel(x, rowAY, 312, rowAH, accent);
  kicker(kick, x + 16, rowAY + 14, accent);
  drawText(head1, x + 16, rowAY + 38, 3, INK);
  drawText(head2, x + 16, rowAY + 62, 3, INK);
  pic(x + 16, rowAY + 90, 280, 100);
  drawBlock(wrap(summary, 280, 2), x + 16, rowAY + 196, 2, INK, 17);
}
storyPanel3(
  28,
  'MIDDLE EAST',
  'US STRIKES IRAN',
  'IRAN HITS BACK',
  'US HIT A MISSILE SITE ON QESHM ISLAND.',
  RED,
  picMissile,
);
storyPanel3(
  356,
  'UKRAINE',
  'KERCH BRIDGE',
  'HIT AGAIN',
  'SECOND DAY OF STRIKES. SPAN COLLAPSED.',
  BLUE,
  picBridge,
);
storyPanel3(
  684,
  'US SENATE',
  'PELTOLA WINS',
  'ALASKA SEAT',
  'PELTOLA BEAT SULLIVAN. DEMOCRATS TAKE 56-44.',
  GREEN,
  picBallot,
);

// Row B: two panels
const rowBY = 692;
const rowBH = 224;
function storyPanel2(
  x: number,
  kick: string,
  head1: string,
  head2: string,
  summary: string,
  accent: RGB,
  pic: (x: number, y: number, w: number, h: number) => void,
): void {
  panel(x, rowBY, 476, rowBH, accent);
  kicker(kick, x + 16, rowBY + 16, accent);
  drawText(head1, x + 16, rowBY + 42, 4, INK);
  drawText(head2, x + 16, rowBY + 74, 4, INK);
  pic(x + 16, rowBY + 110, 200, 100);
  drawBlock(wrap(summary, 228, 2), x + 232, rowBY + 110, 2, INK, 17);
}
storyPanel2(
  28,
  'SPACE',
  'VOYAGER 1 REACHES',
  'ONE LIGHT-DAY',
  'THE PROBE IS ABOUT 16 BILLION MILES FROM EARTH, THE FIRST HUMAN-MADE OBJECT TO FLY ONE LIGHT-DAY AWAY.',
  DARKBLUE,
  picVoyager,
);
storyPanel2(
  520,
  'HEALTH',
  'US LOSES MEASLES-',
  'FREE STATUS',
  'AFTER 26 YEARS, THE US LOST ITS MEASLES-FREE STATUS. 5,412 CASES IN 2026, THE MOST SINCE 1991.',
  RED,
  picVirus,
);

// Footer strip: two more headlines
rect(28, 932, 968, 64, INK);
drawTextCentered('EBOLA IN DR CONGO PASSES 11,000 CASES - SECOND LARGEST ON RECORD', 512, 944, 2, PAPER);
drawTextCentered('NVIDIA BOARD REJECTS HUANG RETURN - RECORD $115.8B QUARTER', 512, 968, 2, PAPER);

// ---- PNG encoder (hand-written, deterministic) ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/entry.png`, encodePNG());
