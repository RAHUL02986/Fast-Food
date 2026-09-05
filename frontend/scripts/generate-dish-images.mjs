// Generates illustrated placeholder images for dishes into frontend/public/dishes/.
// Run from the frontend folder:  node scripts/generate-dish-images.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/dishes");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- shared building blocks ----------

const doc = (c1, c2, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
</defs>
<rect width="800" height="600" fill="url(#bg)"/>
<circle cx="400" cy="300" r="235" fill="#ffffff" opacity="0.35"/>
${body}
</svg>
`;

const steam = (cx, y, o = 0.75) =>
  [-52, 0, 52]
    .map(
      (dx, i) =>
        `<path d="M${cx + dx} ${y} q-16 -26 0 -52 q16 -26 0 -52" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="${(o - i * 0.12).toFixed(2)}"/>`
    )
    .join("");

const plate = (y = 390, rx = 220, ry = 62) =>
  `<ellipse cx="400" cy="${y}" rx="${rx}" ry="${ry}" fill="#ffffff"/><ellipse cx="400" cy="${y - 6}" rx="${rx - 34}" ry="${ry - 20}" fill="#F1F3F6"/>`;

const dip = (x, y, color, r = 44) =>
  `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.44}" fill="#ffffff"/><ellipse cx="${x}" cy="${y - 5}" rx="${r - 11}" ry="${Math.max(r * 0.44 - 9, 10)}" fill="${color}"/>`;

const dumpling = (cx, y, s = 1) => `<g transform="translate(${cx} ${y}) scale(${s})">
  <path d="M-52 0 q0 -66 52 -66 q52 0 52 66 q-52 16 -104 0 Z" fill="#FFF6E8" stroke="#EAD3AC" stroke-width="4"/>
  <path d="M-26 -58 q6 20 0 44 M0 -64 q4 22 0 50 M26 -58 q-6 20 0 44" stroke="#E3CBA8" stroke-width="5" fill="none" stroke-linecap="round"/>
</g>`;

const sushiRoll = (cx, cy, center) => `<g transform="translate(${cx} ${cy})">
  <circle r="54" fill="#2F4436"/><circle r="41" fill="#FAF7F0"/><circle r="17" fill="${center}"/>
  <circle cx="-18" cy="-14" r="3" fill="#EFE9DC"/><circle cx="16" cy="-20" r="3" fill="#EFE9DC"/><circle cx="20" cy="14" r="3" fill="#EFE9DC"/><circle cx="-16" cy="18" r="3" fill="#EFE9DC"/>
</g>`;

const sparkle = (cx, cy, s = 1) =>
  `<path d="M${cx} ${cy - 20 * s} l${5 * s} ${14 * s} ${14 * s} ${6 * s} -${14 * s} ${6 * s} -${5 * s} ${14 * s} -${5 * s} -${14 * s} -${14 * s} -${6 * s} ${14 * s} -${6 * s} Z" fill="#ffffff" opacity="0.9"/>`;

// ---------- dishes ----------

const dishes = {};

dishes.chai = doc("#FBEED8", "#F3D9AC", `
  <path d="M502 330 q58 4 52 50 q-6 44 -58 36" fill="none" stroke="#ffffff" stroke-width="18"/>
  <path d="M295 296 h210 l-22 112 q-83 26 -166 0 Z" fill="#ffffff" stroke="#EBDFC9" stroke-width="4"/>
  <ellipse cx="400" cy="296" rx="105" ry="27" fill="#A85B2A"/>
  <ellipse cx="378" cy="292" rx="52" ry="12" fill="#C97B45" opacity="0.85"/>
  ${steam(340, 232)}
  ${plate(408, 195, 52)}
  <circle cx="262" cy="412" r="7" fill="#7B4A21"/><circle cx="286" cy="422" r="6" fill="#5C7345"/><circle cx="530" cy="416" r="6" fill="#5C7345"/>
`);

dishes.coffee = doc("#F3EBE1", "#DCC7AE", `
  <path d="M502 320 q62 0 56 50 q-6 44 -60 38" fill="none" stroke="#ffffff" stroke-width="18"/>
  <rect x="298" y="266" width="204" height="136" rx="22" fill="#ffffff" stroke="#E7DAC8" stroke-width="4"/>
  <ellipse cx="400" cy="266" rx="102" ry="26" fill="#5F3B22"/>
  <path d="M340 262 q30 -16 60 0 q30 16 60 0" fill="none" stroke="#A97142" stroke-width="9" stroke-linecap="round"/>
  ${steam(340, 210)}
  ${plate(408, 200, 54)}
  <ellipse cx="270" cy="416" rx="14" ry="9" fill="#5C3A1E" transform="rotate(-18 270 416)"/>
  <ellipse cx="296" cy="424" rx="14" ry="9" fill="#4A2E15" transform="rotate(14 296 424)"/>
`);

dishes.lassi = doc("#FFF4D6", "#FFE098", `
  <ellipse cx="400" cy="470" rx="128" ry="30" fill="#ffffff" opacity="0.9"/>
  <path d="M336 268 h128 l-12 186 q-52 18 -104 0 Z" fill="#F7B733"/>
  <rect x="352" y="300" width="40" height="40" rx="8" fill="#ffffff" opacity="0.35" transform="rotate(14 372 320)"/>
  <path d="M330 206 h140 l-14 262 q-56 20 -112 0 Z" fill="#ffffff" opacity="0.5" stroke="#ffffff" stroke-width="4"/>
  <ellipse cx="400" cy="268" rx="66" ry="15" fill="#FFDD7A"/>
  <ellipse cx="400" cy="260" rx="72" ry="17" fill="#FFF3C9"/>
  <circle cx="378" cy="252" r="4" fill="#6B8E4E"/><circle cx="402" cy="248" r="4" fill="#6B8E4E"/><circle cx="424" cy="255" r="4" fill="#6B8E4E"/>
  <g transform="rotate(16 470 180)"><rect x="462" y="96" width="17" height="190" rx="8" fill="#E85D75"/><rect x="462" y="130" width="17" height="18" fill="#ffffff" opacity="0.9"/><rect x="462" y="166" width="17" height="18" fill="#ffffff" opacity="0.9"/></g>
`);

dishes.juice = doc("#FFE9CF", "#FFD3A1", `
  <ellipse cx="400" cy="472" rx="126" ry="30" fill="#ffffff" opacity="0.9"/>
  <path d="M338 262 h124 l-12 190 q-50 18 -100 0 Z" fill="#F5923E"/>
  <rect x="352" y="300" width="40" height="40" rx="8" fill="#ffffff" opacity="0.45" transform="rotate(14 372 320)"/>
  <rect x="400" y="330" width="34" height="34" rx="8" fill="#ffffff" opacity="0.45" transform="rotate(-12 417 347)"/>
  <path d="M332 204 h136 l-14 250 q-54 20 -108 0 Z" fill="#ffffff" opacity="0.45" stroke="#ffffff" stroke-width="4"/>
  <ellipse cx="400" cy="262" rx="64" ry="14" fill="#FFB25E"/>
  <g transform="rotate(-22 508 216)">
    <circle cx="508" cy="216" r="36" fill="#FFB347" stroke="#F5820D" stroke-width="8"/>
    <path d="M508 216 L508 186 M508 216 L534 201 M508 216 L534 231 M508 216 L508 246 M508 216 L482 231 M508 216 L482 201" stroke="#FFE3B8" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g transform="rotate(12 322 178)"><rect x="316" y="96" width="15" height="190" rx="7" fill="#5FA052"/></g>
`);

dishes.tikka = doc("#FBE7DA", "#F2BE97", `
  ${plate(402, 238, 66)}
  ${[268, 372, 476]
    .map(
      (x, i) => `
  <g transform="translate(${x} 318) rotate(${i === 1 ? -7 : 7})">
    <rect x="-8" y="-70" width="16" height="184" rx="8" fill="#8A5A33"/>
    <rect x="-34" y="-112" width="68" height="64" rx="18" fill="#F2A25C" stroke="#DD7E2B" stroke-width="5"/>
    <rect x="-34" y="-38" width="68" height="64" rx="18" fill="#E56B33" stroke="#C4551F" stroke-width="5"/>
    <circle cx="-11" cy="-92" r="5" fill="#FFDCA8"/><circle cx="13" cy="-74" r="5" fill="#FFDCA8"/>
    <circle cx="13" cy="-16" r="5" fill="#F8A870"/><circle cx="-13" cy="2" r="5" fill="#F8A870"/>
    <rect x="-28" y="34" width="56" height="34" rx="15" fill="#7FB069"/>
  </g>`
    )
    .join("")}
  ${dip(592, 432, "#57B380")}
  <circle cx="222" cy="430" r="8" fill="#D9534F"/><circle cx="200" cy="442" r="6" fill="#5C7345"/>
  ${sparkle(584, 182, 1.2)}
`);

dishes.kebab = doc("#F7E8DB", "#EEC7A4", `
  ${plate(402, 240, 66)}
  ${[302, 402, 502]
    .map(
      (x, i) => `
  <g transform="translate(${x} ${314 + (i === 1 ? -16 : 0)}) rotate(${i === 0 ? -9 : i === 1 ? 0 : 9})">
    <path d="M-72 0 q-8 -40 14 -52 q58 -24 116 0 q22 12 14 52 q-60 28 -144 0 Z" fill="#9C5B2E" stroke="#7A421F" stroke-width="5"/>
    <path d="M-54 -20 q54 -22 108 0 M-50 6 q50 18 100 0" stroke="#7A421F" stroke-width="4" fill="none" opacity="0.45"/>
    <circle cx="-22" cy="-32" r="4" fill="#B97B47"/><circle cx="12" cy="-38" r="4" fill="#B97B47"/><circle cx="38" cy="-24" r="4" fill="#B97B47"/>
  </g>`
    )
    .join("")}
  <g fill="none" stroke="#B77FD1" stroke-width="7"><circle cx="600" cy="414" r="25"/><circle cx="624" cy="414" r="25"/></g>
  ${dip(210, 432, "#57B380")}
  ${sparkle(214, 188)}
`);

dishes.biryani = doc("#FFF3D9", "#F5DCAB", `
  ${steam(336, 222)}
  <ellipse cx="400" cy="404" rx="242" ry="72" fill="#ffffff"/>
  <ellipse cx="400" cy="394" rx="212" ry="58" fill="#E8EDF2"/>
  <ellipse cx="400" cy="384" rx="178" ry="46" fill="#F6E2B8"/>
  ${[
    [330, 376, 26],
    [388, 368, 30],
    [446, 376, 26],
    [356, 396, 24],
    [424, 394, 24],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${Math.round(r * 0.62)}" fill="#FBF3E0" stroke="#E8D3A8" stroke-width="3"/>`)
    .join("")}
  <ellipse cx="400" cy="386" rx="34" ry="15" fill="#E8A33D"/>
  <circle cx="350" cy="366" r="7" fill="#5C7345"/><circle cx="454" cy="368" r="7" fill="#5C7345"/>
  ${dip(566, 442, "#FDF6EC")}
  <circle cx="566" cy="430" r="5" fill="#5C7345"/>
  ${sparkle(600, 206)}
`);

dishes.curry = doc("#FDEBD7", "#F1C69A", `
  ${steam(336, 212)}
  <path d="M214 362 a176 100 0 0 0 352 0 Z" fill="#ffffff"/>
  <ellipse cx="390" cy="362" rx="176" ry="44" fill="#E2703A"/>
  <path d="M318 352 q36 28 72 0 q36 -28 72 0" stroke="#FFD9B8" stroke-width="11" fill="none" stroke-linecap="round"/>
  <circle cx="352" cy="382" r="7" fill="#FFD9B8"/><circle cx="432" cy="378" r="7" fill="#FFD9B8"/>
  <circle cx="346" cy="344" r="6" fill="#5C7345"/><circle cx="438" cy="350" r="6" fill="#5C7345"/>
  <ellipse cx="618" cy="430" rx="52" ry="19" fill="#ffffff"/><ellipse cx="618" cy="424" rx="40" ry="13" fill="#F7EFE2"/>
  ${sparkle(214, 218)}
`);

dishes.ramen = doc("#FDE9DC", "#F1C2A1", `
  ${steam(326, 220)}
  <path d="M196 358 a204 106 0 0 0 408 0 Z" fill="#ffffff"/>
  <ellipse cx="400" cy="358" rx="204" ry="50" fill="#E9A23B"/>
  ${[
    [318, 354],
    [400, 348],
    [482, 354],
  ]
    .map(
      ([x, y]) => `
  <g transform="translate(${x} ${y})"><path d="M-46 -6 q11 -12 23 0 q11 12 23 0 q11 -12 23 0 q11 12 23 0" stroke="#F6E7C8" stroke-width="9" fill="none" stroke-linecap="round"/></g>`
    )
    .join("")}
  <ellipse cx="398" cy="330" rx="40" ry="17" fill="#F3A68B"/>
  <circle cx="398" cy="326" r="9" fill="#FFF6E8"/><circle cx="398" cy="326" r="4.5" fill="#F2B33D"/>
  <rect x="472" y="300" width="30" height="46" rx="4" fill="#2F4436"/>
  <rect x="476" y="304" width="22" height="8" fill="#ffffff" opacity="0.25"/>
  <rect x="298" y="318" width="36" height="30" rx="7" fill="#F7EFE2" stroke="#E4D6BE" stroke-width="3"/>
  <g transform="translate(400 300) rotate(24)"><rect x="-7" y="-152" width="13" height="152" rx="6" fill="#B07A45"/><rect x="9" y="-152" width="13" height="152" rx="6" fill="#B07A45"/></g>
  ${sparkle(592, 208)}
`);

dishes.noodles = doc("#FFF1DC", "#F2D19C", `
  ${steam(330, 252, 0.6)}
  <ellipse cx="400" cy="412" rx="238" ry="70" fill="#ffffff"/>
  <ellipse cx="400" cy="402" rx="206" ry="56" fill="#F6EFDF"/>
  ${[
    [324, 398],
    [400, 388],
    [476, 398],
  ]
    .map(
      ([x, y]) => `
  <g transform="translate(${x} ${y})"><path d="M-52 -8 q13 -14 26 0 q13 14 26 0 q13 -14 26 0 q13 14 26 0" stroke="#F2D98A" stroke-width="11" fill="none" stroke-linecap="round"/></g>`
    )
    .join("")}
  <circle cx="334" cy="384" r="9" fill="#E5533C"/><circle cx="412" cy="374" r="9" fill="#7FB069"/><circle cx="472" cy="388" r="9" fill="#E5533C"/>
  <g transform="translate(452 318) rotate(26)"><rect x="-7" y="-162" width="14" height="162" rx="7" fill="#B07A45"/><rect x="9" y="-162" width="14" height="162" rx="7" fill="#B07A45"/></g>
`);

dishes.sushi = doc("#EAF3EC", "#CBE3D2", `
  ${plate(404, 252, 70)}
  ${sushiRoll(278, 342, "#E5533C")}
  ${sushiRoll(406, 330, "#7FB069")}
  ${sushiRoll(534, 344, "#F2A25C")}
  <g transform="translate(560 208) rotate(16)">
    <rect x="-96" y="-22" width="192" height="13" rx="6" fill="#B07A45"/>
    <rect x="-78" y="-4" width="192" height="13" rx="6" fill="#9C6A3C"/>
  </g>
  <g fill="#2F4436" opacity="0.9"><ellipse cx="212" cy="196" rx="17" ry="7"/><ellipse cx="236" cy="187" rx="14" ry="6"/></g>
  ${dip(636, 452, "#3A3A3A", 34)}
  ${sparkle(178, 168)}
`);

dishes.soup = doc("#FFF0E0", "#F4D2AC", `
  ${steam(336, 212)}
  <path d="M214 352 a186 102 0 0 0 372 0 Z" fill="#ffffff"/>
  <ellipse cx="400" cy="352" rx="186" ry="46" fill="#F2A23C"/>
  <circle cx="336" cy="344" r="9" fill="#E5533C"/><circle cx="432" cy="334" r="8" fill="#7FB069"/><circle cx="468" cy="352" r="7" fill="#E5533C"/>
  <path d="M328 340 q30 20 60 2" stroke="#FFD9B0" stroke-width="8" fill="none" stroke-linecap="round"/>
  <g transform="translate(566 322) rotate(36)"><rect x="-8" y="-158" width="16" height="176" rx="8" fill="#B07A45"/><ellipse cx="0" cy="-166" rx="36" ry="23" fill="#B07A45"/></g>
  ${sparkle(592, 196)}
`);

dishes.samosa = doc("#FDF2DC", "#F2D9A4", `
  ${plate(412, 238, 64)}
  ${[296, 410, 524]
    .map(
      (x, i) => `
  <g transform="translate(${x} ${344 + (i === 1 ? -26 : 0)}) rotate(${i === 0 ? -10 : i === 1 ? 0 : 10})">
    <path d="M-56 36 L0 -64 L56 36 q-56 26 -112 0 Z" fill="#E8A94F" stroke="#C9862F" stroke-width="5" stroke-linejoin="round"/>
    <path d="M-32 30 L-6 -46 M2 32 L28 -38" stroke="#C9862F" stroke-width="4" opacity="0.55"/>
  </g>`
    )
    .join("")}
  ${dip(204, 452, "#57B380")}
  ${dip(606, 452, "#C43D2F")}
  ${sparkle(586, 182)}
`);

dishes.pasta = doc("#FFEFE3", "#F5CDA8", `
  ${plate(410, 246, 68)}
  <ellipse cx="400" cy="398" rx="192" ry="56" fill="#F6EFDF"/>
  ${[[330, 398], [404, 386], [476, 400]]
    .map(
      ([x, y]) => `
  <g transform="translate(${x} ${y})">
    <path d="M-58 -6 q15 -16 29 0 q15 16 29 0 q15 -16 29 0 q15 16 29 0" stroke="#F2CE6B" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M-50 14 q14 -14 27 0 q14 14 27 0 q14 -14 27 0" stroke="#E9BE54" stroke-width="11" fill="none" stroke-linecap="round"/>
  </g>`
    )
    .join("")}
  <ellipse cx="400" cy="358" rx="64" ry="26" fill="#E2603F"/>
  <circle cx="376" cy="350" r="5" fill="#7FB069"/><circle cx="428" cy="362" r="5" fill="#7FB069"/>
  <circle cx="312" cy="372" r="8" fill="#E5533C"/><circle cx="494" cy="376" r="8" fill="#E5533C"/>
  <g transform="translate(436 296) rotate(30)"><rect x="-6" y="-158" width="12" height="150" rx="6" fill="#8A5A33"/><ellipse cx="0" cy="-156" rx="42" ry="15" fill="#7FB069"/></g>
  ${sparkle(604, 204)}
`);

dishes.pizza = doc("#FFF0D6", "#F6D9A0", `
  <circle cx="400" cy="330" r="188" fill="#E8B04B"/>
  <circle cx="400" cy="330" r="168" fill="#F6C860"/>
  <circle cx="400" cy="330" r="152" fill="#E2603F"/>
  <circle cx="400" cy="330" r="142" fill="#EF7B4F"/>
  <circle cx="338" cy="286" r="21" fill="#C43D2F"/><circle cx="452" cy="268" r="21" fill="#C43D2F"/><circle cx="484" cy="376" r="21" fill="#C43D2F"/><circle cx="350" cy="392" r="21" fill="#C43D2F"/><circle cx="400" cy="330" r="21" fill="#C43D2F"/>
  <circle cx="298" cy="352" r="9" fill="#7FB069"/><circle cx="420" cy="234" r="9" fill="#7FB069"/><circle cx="500" cy="318" r="9" fill="#7FB069"/><circle cx="328" cy="438" r="9" fill="#7FB069"/>
  ${sparkle(204, 182, 1.1)}
`);

dishes.burger = doc("#FFF3DC", "#F3D9A4", `
  ${plate(440, 236, 58)}
  <g transform="translate(400 336)">
    <path d="M-126 22 a126 78 0 0 1 252 0 q0 14 -14 14 h-224 q-14 0 -14 -14 Z" fill="#F2B45C"/>
    <circle cx="-56" cy="-52" r="5" fill="#FFF3DC"/><circle cx="12" cy="-66" r="5" fill="#FFF3DC"/><circle cx="64" cy="-46" r="5" fill="#FFF3DC"/><circle cx="-10" cy="-34" r="5" fill="#FFF3DC"/>
    <path d="M-134 44 q34 18 67 0 q34 -18 67 0 q34 18 67 0 q34 -18 67 0 l0 16 q-134 24 -268 0 Z" fill="#7FB069"/>
    <rect x="-118" y="64" width="236" height="36" rx="17" fill="#C43D2F"/>
    <rect x="-118" y="100" width="236" height="30" rx="15" fill="#E8A94F"/>
  </g>
  ${sparkle(196, 198, 1.1)}
`);

dishes.fries = doc("#FFF6E0", "#F4DCA4", `
  <g transform="translate(400 320)">
    ${[-58, -29, 0, 29, 58]
      .map(
        (x) =>
          `<g transform="rotate(${x * 0.14})"><rect x="${x - 12}" y="${-170 + Math.abs(x) * 0.4}" width="24" height="205" rx="11" fill="#F7CE55" stroke="#E3B33C" stroke-width="3"/></g>`
      )
      .join("")}
    <path d="M-118 -34 h236 l-24 196 q-94 30 -188 0 Z" fill="#E5533C"/>
    <path d="M-118 -34 h236 l-6 48 q-112 30 -224 0 Z" fill="#C43D2F" opacity="0.5"/>
    <circle cx="0" cy="104" r="24" fill="#ffffff" opacity="0.9"/>
    <path d="M-10 104 l7 8 14 -16" stroke="#E5533C" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  ${sparkle(596, 192, 1.1)}
`);

dishes.salad = doc("#EFF7EA", "#CDE6C4", `
  ${plate(410, 244, 66)}
  <ellipse cx="400" cy="392" rx="182" ry="52" fill="#7FB069"/>
  <ellipse cx="400" cy="384" rx="166" ry="44" fill="#93C47D"/>
  <g fill="#4E8A3C">
    <path d="M300 372 q34 -34 68 0 q-34 22 -68 0 Z"/>
    <path d="M396 364 q36 -36 72 0 q-36 24 -72 0 Z"/>
    <path d="M344 406 q32 -30 64 0 q-32 20 -64 0 Z"/>
  </g>
  <circle cx="330" cy="358" r="13" fill="#E5533C"/><circle cx="452" cy="350" r="13" fill="#E5533C"/>
  <circle cx="500" cy="398" r="12" fill="#F2C94C"/><circle cx="306" cy="408" r="12" fill="#F2C94C"/>
  <circle cx="396" cy="340" r="11" fill="#ffffff"/><circle cx="432" cy="418" r="11" fill="#ffffff"/>
  <g transform="translate(560 268) rotate(40)"><rect x="-7" y="-150" width="14" height="140" rx="7" fill="#8A5A33"/><ellipse cx="0" cy="-148" rx="40" ry="14" fill="#93C47D"/></g>
  ${sparkle(214, 190)}
`);
dishes.dessert = doc("#FDEFF4", "#F3C9D8", `
  ${plate(424, 214, 50)}
  <g transform="translate(400 352)">
    <path d="M-112 54 L112 54 L112 -32 L-112 4 Z" fill="#F6D9A8"/>
    <path d="M-112 4 L112 -32 L112 -60 L-112 -24 Z" fill="#F3AFC7"/>
    <path d="M-112 22 q28 14 56 0 q28 -14 56 0 q28 14 56 0 q28 -14 56 0 L112 54 L-112 54 Z" fill="#ffffff"/>
    <circle cx="0" cy="-78" r="17" fill="#E5533C"/>
    <path d="M0 -95 q4 -12 13 -16" stroke="#5C7345" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>
  ${sparkle(588, 198, 1.1)}
`);

dishes.dosa = doc("#FFF4DE", "#F3DCA8", `
  ${plate(412, 248, 66)}
  <path d="M208 382 q192 -176 384 -20 q-42 46 -124 41 q-162 -11 -260 -21 Z" fill="#E8B04B"/>
  <path d="M230 372 q172 -150 338 -24 q-152 -36 -338 24 Z" fill="#F4CD80"/>
  ${dip(266, 464, "#C43D2F", 38)}
  ${dip(388, 470, "#FAF7F0", 38)}
  ${dip(508, 464, "#57B380", 38)}
  ${sparkle(588, 196)}
`);

dishes.naan = doc("#FFF1D8", "#F2D8A0", `
  ${plate(418, 246, 62)}
  <g transform="translate(400 358) rotate(-8)">
    <path d="M-158 26 q-30 -60 30 -86 q66 -30 150 -22 q86 8 122 52 q26 34 -8 62 q-58 44 -150 40 q-108 -4 -144 -46 Z" fill="#E8B04B" stroke="#C98F3A" stroke-width="5"/>
    <path d="M-118 4 q-16 -34 20 -50 q50 -22 112 -16 q66 6 92 34 q16 20 -6 36 q-42 30 -108 27 q-76 -3 -110 -31 Z" fill="#F4CD80"/>
    <circle cx="-52" cy="-20" r="9" fill="#C98F3A" opacity="0.7"/><circle cx="26" cy="-42" r="8" fill="#C98F3A" opacity="0.7"/><circle cx="94" cy="-10" r="9" fill="#C98F3A" opacity="0.7"/><circle cx="30" cy="24" r="8" fill="#C98F3A" opacity="0.7"/>
    <rect x="-36" y="-18" width="72" height="32" rx="9" fill="#FFE08A" transform="rotate(6)"/>
  </g>
  ${sparkle(602, 198)}
`);

dishes.icecream = doc("#EFF4FC", "#CFE0F4", `
  <g transform="translate(400 330)">
    <path d="M-46 66 L46 66 L6 262 L-6 262 Z" fill="#E3B98A"/>
    <path d="M-46 66 L46 66 L36 96 L-36 96 Z" fill="#D0A273"/>
    <path d="M-8 250 L8 250 L2 282 L-2 282 Z" fill="#B98757"/>
    <circle cx="-44" cy="18" r="46" fill="#F6C1CF"/>
    <circle cx="0" cy="-22" r="52" fill="#F9DCC4"/>
    <circle cx="46" cy="18" r="46" fill="#BFD8F2"/>
    <circle cx="-20" cy="-8" r="10" fill="#ffffff" opacity="0.8"/>
    <circle cx="30" cy="4" r="8" fill="#ffffff" opacity="0.8"/>
    <circle cx="0" cy="-78" r="12" fill="#E5533C"/>
  </g>
  ${sparkle(592, 200, 1.1)}
`);

dishes.egg = doc("#FFF8E8", "#F6E2B8", `
  ${plate(408, 218, 54)}
  <g transform="translate(400 350)">
    <ellipse cx="-64" cy="-24" rx="88" ry="52" fill="#ffffff" stroke="#EDE4D2" stroke-width="4"/>
    <circle cx="-64" cy="-26" r="34" fill="#F2B01E"/>
    <ellipse cx="66" cy="-38" rx="74" ry="40" fill="#ffffff" stroke="#EDE4D2" stroke-width="4"/>
    <circle cx="66" cy="-40" r="27" fill="#F2B01E"/>
    <path d="M-146 40 q66 26 132 12" fill="none" stroke="#E3CBA8" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g transform="translate(560 250) rotate(30)"><rect x="-6" y="-140" width="12" height="130" rx="6" fill="#8A5A33"/><ellipse cx="0" cy="-140" rx="34" ry="13" fill="#F2A93B"/></g>
  ${sparkle(220, 200)}
`);

dishes.default = doc("#FDF3E4", "#F3DFC0", `
  ${plate(410, 236, 62)}
  <ellipse cx="400" cy="386" rx="168" ry="46" fill="#F6E3C2"/>
  <ellipse cx="352" cy="370" rx="66" ry="28" fill="#F2C94C"/>
  <ellipse cx="466" cy="398" rx="72" ry="30" fill="#A9C48A"/>
  <circle cx="322" cy="404" r="14" fill="#E5533C"/>
  <circle cx="482" cy="362" r="12" fill="#E5533C"/>
  ${steam(400, 262)}
  ${sparkle(594, 194, 1.1)}
`);

// ---------- write ----------

const count = Object.keys(dishes).length;
for (const [name, svg] of Object.entries(dishes)) {
  fs.writeFileSync(path.join(OUT_DIR, `${name}.svg`), svg);
}
console.log(`Wrote ${count} dish images to ${OUT_DIR}`);
// __MORE_1__