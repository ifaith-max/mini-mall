/**
 * 生成商品卡通插画：public/images/products/<slug>.png
 * 运行：npm run images:generate
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.resolve(process.cwd(), "public/images/products");

function scene({ bg, circle, accent, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${bg}"/>
  <circle cx="400" cy="392" r="268" fill="${circle}"/>
  <circle cx="142" cy="172" r="14" fill="${accent}" opacity="0.35"/>
  <circle cx="660" cy="612" r="20" fill="${accent}" opacity="0.28"/>
  <path d="M650 150 l9 22 22 9 -22 9 -9 22 -9 -22 -22 -9 22 -9 z" fill="${accent}" opacity="0.5"/>
  <path d="M152 640 l7 17 17 7 -17 7 -7 17 -7 -17 -17 -7 17 -7 z" fill="${accent}" opacity="0.42"/>
  <ellipse cx="400" cy="648" rx="178" ry="22" fill="#0f172a" opacity="0.07"/>
  ${body}
</svg>`;
}

function keyboardKeys() {
  const palette = ["#DBEAFE", "#EFF6FF", "#BFDBFE"];
  let keys = "";
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const x = 190 + col * 49;
      const y = 368 + row * 50;
      const fill =
        row === 1 && col === 4
          ? "#818CF8"
          : palette[(row + col) % palette.length];
      keys += `<rect x="${x}" y="${y}" width="38" height="36" rx="9" fill="${fill}"/>`;
    }
  }
  keys += `<rect x="280" y="518" width="240" height="26" rx="10" fill="#DBEAFE"/>`;
  return keys;
}

const images = {
  "cloud-anc-headphones": scene({
    bg: "#E0F2FE",
    circle: "#BAE6FD",
    accent: "#38BDF8",
    body: `
      <path d="M238 438 C238 300 312 222 400 222 C488 222 562 300 562 438" fill="none" stroke="#1D4ED8" stroke-width="48" stroke-linecap="round"/>
      <path d="M238 438 C238 300 312 222 400 222" fill="none" stroke="#60A5FA" stroke-width="16" stroke-linecap="round" opacity="0.85"/>
      <rect x="182" y="378" width="112" height="196" rx="52" fill="#1E40AF"/>
      <rect x="506" y="378" width="112" height="196" rx="52" fill="#1E40AF"/>
      <rect x="204" y="404" width="68" height="144" rx="34" fill="#3B82F6"/>
      <rect x="528" y="404" width="68" height="144" rx="34" fill="#3B82F6"/>
      <rect x="228" y="348" width="20" height="44" rx="10" fill="#93C5FD"/>
      <rect x="552" y="348" width="20" height="44" rx="10" fill="#93C5FD"/>
    `,
  }),

  "light-mech-keyboard": scene({
    bg: "#EDE9FE",
    circle: "#DDD6FE",
    accent: "#8B5CF6",
    body: `
      <path d="M400 568 v34 q0 20 20 20 h44" fill="none" stroke="#94A3B8" stroke-width="8" stroke-linecap="round"/>
      <rect x="160" y="330" width="480" height="238" rx="32" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="6"/>
      <rect x="176" y="344" width="448" height="16" rx="8" fill="#E2E8F0"/>
      ${keyboardKeys()}
    `,
  }),

  "cube-speaker": scene({
    bg: "#CCFBF1",
    circle: "#99F6E4",
    accent: "#14B8A6",
    body: `
      <path d="M216 366 a82 82 0 0 0 0 116" fill="none" stroke="#2DD4BF" stroke-width="12" stroke-linecap="round"/>
      <path d="M180 340 a132 132 0 0 0 0 168" fill="none" stroke="#2DD4BF" stroke-width="10" stroke-linecap="round" opacity="0.6"/>
      <path d="M584 366 a82 82 0 0 1 0 116" fill="none" stroke="#2DD4BF" stroke-width="12" stroke-linecap="round"/>
      <path d="M620 340 a132 132 0 0 1 0 168" fill="none" stroke="#2DD4BF" stroke-width="10" stroke-linecap="round" opacity="0.6"/>
      <rect x="272" y="248" width="256" height="332" rx="54" fill="#0F766E"/>
      <rect x="294" y="270" width="212" height="288" rx="40" fill="#14B8A6"/>
      <rect x="360" y="224" width="80" height="30" rx="15" fill="#0F766E"/>
      <circle cx="400" cy="239" r="6" fill="#5EEAD4"/>
      <g fill="#0F766E" opacity="0.42">
        <circle cx="340" cy="312" r="6"/><circle cx="370" cy="312" r="6"/><circle cx="400" cy="312" r="6"/><circle cx="430" cy="312" r="6"/><circle cx="460" cy="312" r="6"/>
        <circle cx="340" cy="340" r="6"/><circle cx="370" cy="340" r="6"/><circle cx="400" cy="340" r="6"/><circle cx="430" cy="340" r="6"/><circle cx="460" cy="340" r="6"/>
        <circle cx="340" cy="368" r="6"/><circle cx="370" cy="368" r="6"/><circle cx="400" cy="368" r="6"/><circle cx="430" cy="368" r="6"/><circle cx="460" cy="368" r="6"/>
      </g>
      <circle cx="400" cy="450" r="66" fill="#0D9488"/>
      <circle cx="400" cy="450" r="42" fill="#134E4A"/>
      <circle cx="382" cy="432" r="10" fill="#5EEAD4" opacity="0.7"/>
    `,
  }),

  "obsidian-watch": scene({
    bg: "#FFEDD5",
    circle: "#FED7AA",
    accent: "#FB923C",
    body: `
      <rect x="358" y="150" width="84" height="140" rx="34" fill="#334155"/>
      <rect x="358" y="514" width="84" height="140" rx="34" fill="#334155"/>
      <rect x="376" y="188" width="48" height="10" rx="5" fill="#475569"/>
      <rect x="376" y="608" width="48" height="10" rx="5" fill="#475569"/>
      <rect x="282" y="268" width="236" height="266" rx="66" fill="#0F172A"/>
      <rect x="306" y="292" width="188" height="218" rx="48" fill="#1E293B"/>
      <circle cx="400" cy="392" r="62" fill="#0EA5E9" opacity="0.16"/>
      <circle cx="400" cy="392" r="62" fill="none" stroke="#38BDF8" stroke-width="6"/>
      <path d="M400 392 V352" stroke="#E0F2FE" stroke-width="9" stroke-linecap="round"/>
      <path d="M400 392 l30 18" stroke="#E0F2FE" stroke-width="9" stroke-linecap="round"/>
      <circle cx="400" cy="392" r="8" fill="#F8FAFC"/>
      <path d="M400 474 c-9 -14 -30 -10 -30 6 c0 14 20 24 30 32 c10 -8 30 -18 30 -32 c0 -16 -21 -20 -30 -6 z" fill="#FB7185"/>
      <rect x="514" y="330" width="20" height="58" rx="10" fill="#94A3B8"/>
      <rect x="514" y="404" width="20" height="38" rx="10" fill="#64748B"/>
    `,
  }),

  "linen-cloud-cushion": scene({
    bg: "#FEF3C7",
    circle: "#FDE68A",
    accent: "#F59E0B",
    body: `
      <rect x="215" y="305" width="370" height="302" rx="86" fill="#FFF7ED" stroke="#E7E5E4" stroke-width="7"/>
      <rect x="254" y="344" width="292" height="224" rx="58" fill="none" stroke="#E5E7EB" stroke-width="4" stroke-dasharray="11 12"/>
      <circle cx="400" cy="456" r="9" fill="#E7E5E4"/>
      <path d="M400 447 v-20 M400 465 v20 M391 456 h-20 M409 456 h20" stroke="#E7E5E4" stroke-width="5" stroke-linecap="round"/>
      <path d="M356 430 q-12 12 0 24" fill="none" stroke="#A8A29E" stroke-width="7" stroke-linecap="round"/>
      <path d="M444 430 q12 12 0 24" fill="none" stroke="#A8A29E" stroke-width="7" stroke-linecap="round"/>
      <path d="M384 480 q16 16 32 0" fill="none" stroke="#A8A29E" stroke-width="7" stroke-linecap="round"/>
      <circle cx="338" cy="468" r="11" fill="#FDA4AF" opacity="0.55"/>
      <circle cx="462" cy="468" r="11" fill="#FDA4AF" opacity="0.55"/>
      <g fill="#E0F2FE">
        <circle cx="560" cy="340" r="20"/>
        <circle cx="592" cy="334" r="14"/>
        <circle cx="576" cy="356" r="16"/>
        <rect x="548" y="344" width="42" height="20" rx="10"/>
      </g>
    `,
  }),

  "ceramic-mug": scene({
    bg: "#FCE7F3",
    circle: "#FBCFE8",
    accent: "#EC4899",
    body: `
      <path d="M494 398 c66 0 66 118 0 118" fill="none" stroke="#F9A8D4" stroke-width="34" stroke-linecap="round"/>
      <rect x="242" y="318" width="252" height="268" rx="46" fill="#FFF7ED" stroke="#FBCFE8" stroke-width="8"/>
      <ellipse cx="368" cy="322" rx="112" ry="26" fill="#FFE4E6"/>
      <ellipse cx="368" cy="326" rx="86" ry="16" fill="#7C2D12"/>
      <path d="M330 268 c-22 -28 18 -42 0 -74" fill="none" stroke="#F9A8D4" stroke-width="10" stroke-linecap="round"/>
      <path d="M388 260 c-22 -28 18 -42 0 -74" fill="none" stroke="#F9A8D4" stroke-width="10" stroke-linecap="round"/>
      <path d="M444 268 c-22 -28 18 -42 0 -74" fill="none" stroke="#F9A8D4" stroke-width="10" stroke-linecap="round"/>
      <path d="M368 452 c-12 -18 -40 -12 -40 10 c0 18 27 32 40 42 c13 -10 40 -24 40 -42 c0 -22 -28 -28 -40 -10 z" fill="#FB7185"/>
    `,
  }),

  "pine-scented-candle": scene({
    bg: "#DCFCE7",
    circle: "#BBF7D0",
    accent: "#22C55E",
    body: `
      <rect x="288" y="348" width="224" height="238" rx="38" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="8"/>
      <rect x="304" y="366" width="192" height="142" rx="18" fill="#D9F99D"/>
      <ellipse cx="400" cy="366" rx="96" ry="18" fill="#F7FEE7"/>
      <rect x="394" y="332" width="12" height="38" rx="6" fill="#4B5563"/>
      <path d="M400 328 C 366 294 386 256 400 228 C 414 256 434 294 400 328 Z" fill="#F97316"/>
      <path d="M400 312 C 384 294 394 274 400 260 C 406 274 416 294 400 312 Z" fill="#FDE68A"/>
      <path d="M400 504 l-34 50 h68 z" fill="#15803D"/>
      <path d="M400 480 l-42 58 h84 z" fill="#16A34A"/>
      <rect x="394" y="552" width="12" height="18" rx="3" fill="#92400E"/>
    `,
  }),

  "wooden-storage-box": scene({
    bg: "#FEF9C3",
    circle: "#FEF08A",
    accent: "#EAB308",
    body: `
      <rect x="176" y="338" width="448" height="254" rx="28" fill="#D97706"/>
      <rect x="176" y="338" width="448" height="54" rx="27" fill="#B45309"/>
      <rect x="202" y="368" width="396" height="196" rx="16" fill="#78350F"/>
      <rect x="218" y="384" width="112" height="164" rx="12" fill="#FDE68A"/>
      <rect x="344" y="384" width="112" height="164" rx="12" fill="#FEF3C7"/>
      <rect x="470" y="384" width="112" height="164" rx="12" fill="#FDE68A"/>
      <rect x="236" y="420" width="76" height="90" rx="10" fill="#60A5FA"/>
      <rect x="250" y="404" width="14" height="22" rx="7" fill="#F87171"/>
      <rect x="366" y="436" width="68" height="68" rx="16" fill="#F472B6"/>
      <rect x="366" y="436" width="68" height="20" rx="10" fill="#F9A8D4"/>
      <circle cx="400" cy="482" r="10" fill="#FDF2F8"/>
      <path d="M500 446 h52 M500 472 h52 M500 498 h52" stroke="#92400E" stroke-width="9" stroke-linecap="round"/>
      <path d="M196 552 q70 12 140 0" fill="none" stroke="#B45309" stroke-width="6" opacity="0.45"/>
      <path d="M420 558 q70 12 140 0" fill="none" stroke="#B45309" stroke-width="6" opacity="0.45"/>
    `,
  }),

  "heavyweight-cotton-tee": scene({
    bg: "#E0E7FF",
    circle: "#C7D2FE",
    accent: "#6366F1",
    body: `
      <path d="M300 252 L356 220 Q400 250 444 220 L500 252 L566 330 L510 368 L510 596 Q400 618 290 596 L290 368 L234 330 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="7" stroke-linejoin="round"/>
      <path d="M356 220 Q400 262 444 220" fill="none" stroke="#CBD5E1" stroke-width="7"/>
      <path d="M290 368 L318 382" stroke="#E2E8F0" stroke-width="6" stroke-linecap="round"/>
      <path d="M510 368 L482 382" stroke="#E2E8F0" stroke-width="6" stroke-linecap="round"/>
      <path d="M312 566 q88 14 176 0" fill="none" stroke="#F1F5F9" stroke-width="6" stroke-linecap="round"/>
      <circle cx="400" cy="410" r="52" fill="#EEF2FF"/>
      <circle cx="384" cy="400" r="6" fill="#6366F1"/>
      <circle cx="416" cy="400" r="6" fill="#6366F1"/>
      <path d="M382 422 q18 18 36 0" fill="none" stroke="#6366F1" stroke-width="7" stroke-linecap="round"/>
    `,
  }),

  "canvas-tote-bag": scene({
    bg: "#FFE4E6",
    circle: "#FECDD3",
    accent: "#F43F5E",
    body: `
      <path d="M320 330 C320 250 364 218 400 218 C436 218 480 250 480 330" fill="none" stroke="#D6B36A" stroke-width="18" stroke-linecap="round"/>
      <rect x="246" y="318" width="308" height="300" rx="24" fill="#F5E6C8" stroke="#E7C98F" stroke-width="7"/>
      <rect x="270" y="342" width="260" height="252" rx="16" fill="none" stroke="#E7C98F" stroke-width="4" stroke-dasharray="10 10"/>
      <rect x="330" y="432" width="140" height="112" rx="14" fill="#F0D9A8" stroke="#D6B36A" stroke-width="5"/>
      <path d="M400 462 c30 8 38 38 20 60 c-22 6 -48 -16 -44 -42 c12 -12 26 -18 24 -18 z" fill="#65A30D"/>
      <path d="M388 512 q8 -30 34 -44" fill="none" stroke="#ECFCCB" stroke-width="5" stroke-linecap="round"/>
    `,
  }),

  "wool-scarf": scene({
    bg: "#F1F5F9",
    circle: "#E2E8F0",
    accent: "#64748B",
    body: `
      <ellipse cx="400" cy="300" rx="150" ry="108" fill="none" stroke="#94A3B8" stroke-width="56"/>
      <path d="M356 390 C350 470 340 530 330 586" fill="none" stroke="#94A3B8" stroke-width="82" stroke-linecap="round"/>
      <path d="M444 390 C450 466 460 516 470 570" fill="none" stroke="#CBD5E1" stroke-width="82" stroke-linecap="round"/>
      <rect x="362" y="358" width="76" height="58" rx="24" fill="#64748B"/>
      <path d="M382 380 q18 -10 36 0" fill="none" stroke="#CBD5E1" stroke-width="6" stroke-linecap="round"/>
      <g stroke="#64748B" stroke-width="9" stroke-linecap="round" opacity="0.5">
        <path d="M300 444 h34"/><path d="M294 486 h34"/><path d="M288 528 h32"/>
      </g>
      <g stroke="#94A3B8" stroke-width="8" stroke-linecap="round" opacity="0.6">
        <path d="M438 452 h30"/><path d="M446 496 h30"/><path d="M454 540 h26"/>
      </g>
      <g stroke="#94A3B8" stroke-width="8" stroke-linecap="round">
        <path d="M292 626 v30"/><path d="M318 630 v30"/><path d="M344 632 v30"/>
        <path d="M446 610 v30"/><path d="M472 604 v30"/><path d="M498 596 v30"/>
      </g>
    `,
  }),

  "pour-over-coffee-beans": scene({
    bg: "#FFEDD5",
    circle: "#FED7AA",
    accent: "#C2410C",
    body: `
      <path d="M286 292 L514 292 L536 596 Q400 624 264 596 Z" fill="#B45309"/>
      <path d="M286 292 L514 292 L520 346 L280 346 Z" fill="#92400E"/>
      <rect x="280" y="278" width="240" height="44" rx="14" fill="#78350F"/>
      <rect x="322" y="386" width="156" height="130" rx="16" fill="#FEF3C7"/>
      <ellipse cx="400" cy="440" rx="34" ry="46" fill="#78350F" transform="rotate(-18 400 440)"/>
      <path d="M384 402 q28 38 0 76" fill="none" stroke="#D97706" stroke-width="7" stroke-linecap="round" transform="rotate(-18 400 440)"/>
      <rect x="360" y="488" width="80" height="8" rx="4" fill="#D6B36A"/>
      <rect x="376" y="502" width="48" height="6" rx="3" fill="#E7C98F"/>
      <g fill="#78350F">
        <ellipse cx="232" cy="620" rx="26" ry="38" transform="rotate(-28 232 620)"/>
        <ellipse cx="578" cy="600" rx="24" ry="34" transform="rotate(24 578 600)"/>
        <ellipse cx="612" cy="520" rx="20" ry="30" transform="rotate(38 612 520)"/>
      </g>
      <g stroke="#D97706" stroke-width="5" stroke-linecap="round" fill="none">
        <path d="M220 594 q24 26 24 52"/>
        <path d="M570 578 q-22 24 -20 46"/>
        <path d="M606 500 q-18 22 -14 40"/>
      </g>
    `,
  }),

  "sea-salt-butter-cookies": scene({
    bg: "#FEF3C7",
    circle: "#FDE68A",
    accent: "#D97706",
    body: `
      <ellipse cx="400" cy="612" rx="190" ry="34" fill="#B45309" opacity="0.16"/>
      <circle cx="326" cy="526" r="120" fill="#D97706"/>
      <circle cx="326" cy="526" r="102" fill="#F59E0B"/>
      <circle cx="452" cy="470" r="112" fill="#D97706"/>
      <circle cx="452" cy="470" r="94" fill="#FBBF24"/>
      <circle cx="382" cy="358" r="104" fill="#D97706"/>
      <circle cx="382" cy="358" r="87" fill="#FCD34D"/>
      <g fill="#78350F">
        <circle cx="352" cy="330" r="10"/><circle cx="406" cy="348" r="9"/><circle cx="370" cy="386" r="8"/><circle cx="336" cy="366" r="7"/>
        <circle cx="420" cy="436" r="10"/><circle cx="466" cy="470" r="9"/><circle cx="440" cy="504" r="8"/><circle cx="490" cy="430" r="7"/>
        <circle cx="300" cy="500" r="9"/><circle cx="350" cy="552" r="8"/><circle cx="300" cy="562" r="7"/>
      </g>
      <g fill="#FFFFFF" opacity="0.92">
        <rect x="364" y="318" width="10" height="10" rx="3" transform="rotate(18 369 323)"/>
        <rect x="398" y="378" width="9" height="9" rx="3" transform="rotate(-22 402 382)"/>
        <rect x="438" y="446" width="10" height="10" rx="3" transform="rotate(30 443 451)"/>
        <rect x="322" y="536" width="9" height="9" rx="3" transform="rotate(-16 326 540)"/>
      </g>
      <g fill="#D97706">
        <circle cx="252" cy="616" r="9"/><circle cx="556" cy="602" r="7"/><circle cx="588" cy="570" r="5"/>
      </g>
    `,
  }),
};

await mkdir(OUT_DIR, { recursive: true });

for (const [slug, svg] of Object.entries(images)) {
  const outputPath = path.join(OUT_DIR, `${slug}.png`);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`生成 ${outputPath}`);
}
