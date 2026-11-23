/* art.js - generates scenic SVG artwork per tour theme, so every card looks good with no image downloads. */
window.TBArt = (() => {
  const sun = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="${c}" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  const wave = (y, c, o = 1) => `<path d="M0 ${y} q50 -16 100 0 t100 0 t100 0 t100 0 V250 H0z" fill="${c}" opacity="${o}"/>`;
  const palm = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q4 -40 -2 -78" stroke="#5b3a1e" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M-2 -78 q-34 -6 -46 18 q26 -12 46 -18z M-2 -78 q30 -14 48 6 q-26 -6 -48 -6z M-2 -78 q-8 -30 -34 -34 q22 8 34 34z M-2 -78 q10 -30 36 -30 q-24 8 -36 30z" fill="#1d7a4e"/></g>`;
  const pine = (x, y, s, c = "#0f5a42") => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -46 L14 -18 H6 L18 4 H-18 L-6 -18 H-14z" fill="${c}"/>`;
  const peak = (pts, c) => `<path d="${pts}" fill="${c}"/>`;

  const scenes = {
    beach: id => ({ sky: ["#ffd89b", "#ff8a5c"], body: `${sun(300, 90, 28, "#fff3c4")}${wave(150, "#35b6c4")}${wave(172, "#1b8fa8")}${wave(196, "#106c86")}
      <path d="M0 214 Q120 196 260 214 T400 208 V250 H0z" fill="#f4d9a0"/>${palm(70, 220, 1.1)}${palm(330, 222, .8)}
      <path d="M150 126 l16 -10 l16 10z" fill="#fff" opacity=".9"/><path d="M158 126 h16 v4 h-16z" fill="#fff"/>` }),
    hills: id => ({ sky: ["#d5f2e3", "#8dd0b4"], body: `${sun(310, 70, 22, "#fffbe0")}<ellipse cx="90" cy="60" rx="46" ry="12" fill="#fff" opacity=".7"/><ellipse cx="250" cy="44" rx="38" ry="10" fill="#fff" opacity=".6"/>
      ${peak("M0 160 L90 80 L170 150 L250 70 L340 150 L400 110 V250 H0z", "#59b08a")}${peak("M0 190 L70 130 L150 185 L240 120 L330 180 L400 145 V250 H0z", "#2f8f6a")}
      ${peak("M0 220 Q100 170 200 205 T400 190 V250 H0z", "#14604a")}${pine(60, 214, 1)}${pine(95, 222, .8)}${pine(330, 212, 1.1)}` }),
    snow: id => ({ sky: ["#bcd9ff", "#eef6ff"], body: `${sun(80, 62, 20, "#fff")}
      ${peak("M0 190 L110 50 L200 170 L270 80 L400 200 V250 H0z", "#8fb2dc")}${peak("M110 50 L82 92 L100 84 L118 100 L132 84 L146 92z", "#fff")}${peak("M270 80 L246 114 L262 108 L276 122 L292 108 L300 118z", "#fff")}
      ${peak("M0 215 Q120 160 230 205 T400 185 V250 H0z", "#e6eef9")}${pine(50, 232, 1.2, "#1c5a58")}${pine(88, 238, 1, "#1c5a58")}${pine(330, 232, 1.3, "#1c5a58")}${pine(362, 238, .9, "#1c5a58")}` }),
    heritage: id => ({ sky: ["#ffe3b3", "#ff9a6a"], body: `${sun(310, 84, 30, "#fff1c9")}
      <path d="M0 200 H400 V250 H0z" fill="#b5532f"/><path d="M40 200 V120 h30 V104 h-6 l12 -22 l12 22 h-6 V120 h30 V200z" fill="#c96a3d"/>
      <path d="M130 200 V96 h140 V200z" fill="#d9794a"/><path d="M130 96 h140 l-14 -16 h-112z" fill="#c96a3d"/>
      ${[148, 176, 204, 232].map(x => `<path d="M${x} 200 v-34 a10 10 0 0 1 20 0 v34z" fill="#7a2f17"/>`).join("")}
      <path d="M170 96 a30 30 0 0 1 60 0z" fill="#e48a58"/><rect x="198" y="48" width="4" height="22" fill="#7a2f17"/><circle cx="200" cy="46" r="5" fill="#ffb83d"/>
      <path d="M290 200 V120 h30 V104 h-6 l12 -22 l12 22 h-6 V120 h30 V200z" fill="#c96a3d"/>` }),
    temple: id => ({ sky: ["#fde7c6", "#f6a560"], body: `${sun(90, 80, 26, "#fff6d6")}
      <path d="M0 212 H400 V250 H0z" fill="#8a4a24"/><path d="M110 212 V150 h180 V212z" fill="#e8a05a"/>
      <path d="M150 150 V118 h100 V150z" fill="#f0b46e"/><path d="M168 118 q32 -66 64 0z" fill="#ffd28a"/><path d="M200 52 v18" stroke="#8a4a24" stroke-width="3"/><path d="M200 52 l14 5 l-14 5z" fill="#d83a2a"/>
      ${[130, 170, 210, 250].map(x => `<rect x="${x}" y="164" width="14" height="48" fill="#c9792f"/>`).join("")}<path d="M184 212 v-26 a16 16 0 0 1 32 0 v26z" fill="#6a3418"/>` }),
    city: id => ({ sky: ["#1e3b63", "#ff8e72"], body: `${sun(200, 150, 34, "#ffd9a6")}
      ${[[10, 120, 46], [60, 90, 40], [104, 140, 36], [146, 70, 44], [194, 110, 40], [238, 80, 38], [280, 130, 42], [326, 100, 36], [366, 124, 40]].map(([x, y, w]) => `<rect x="${x}" y="${y + 40}" width="${w}" height="${210 - y}" fill="#14243d"/>${[0, 1, 2, 3].map(r => `<rect x="${x + 6}" y="${y + 50 + r * 22}" width="6" height="8" fill="#ffd36e" opacity=".85"/><rect x="${x + w - 14}" y="${y + 50 + r * 22}" width="6" height="8" fill="#ffd36e" opacity=".5"/>`).join("")}`).join("")}
      <path d="M0 214 H400 V250 H0z" fill="#0c1a2e"/>` }),
    backwater: id => ({ sky: ["#e0f6e6", "#a6dfba"], body: `${sun(320, 66, 22, "#fffbe0")}
      <path d="M0 140 Q100 108 200 136 T400 126 V250 H0z" fill="#3c9a66"/><path d="M0 170 H400 V250 H0z" fill="#3fb0b5"/>
      <path d="M0 190 h400 M0 212 h400" stroke="#8fdadb" stroke-width="2" opacity=".6"/>
      ${palm(48, 176, 1)}${palm(352, 172, .9)}${palm(310, 170, .7)}
      <path d="M130 196 h120 l-14 20 h-92z" fill="#7a4a1f"/><path d="M142 196 q48 -36 96 0z" fill="#e8c36a"/><path d="M142 196 h96" stroke="#fff" stroke-width="3"/>` })
  };

  function tour(theme, id) {
    const s = (scenes[theme] || scenes.hills)(id);
    const g = "g" + String(id).replace(/\W/g, "");
    return `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${theme} scene" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.sky[0]}"/><stop offset="1" stop-color="${s.sky[1]}"/></linearGradient></defs>
      <rect width="400" height="250" fill="url(#${g})"/>${s.body}</svg>`;
  }
  return { tour };
})();
