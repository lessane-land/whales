// The sea behind the 3D prototypes, drawn as in the mockups.
export function paintSea(sea, W, H, dpr, NIGHT) {
// The sea, drawn as in the mockups.
const sctx = sea.getContext("2d");
sea.width = W * dpr; sea.height = H * dpr; sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
const sy = Math.round(H * 0.22);
function rgb(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
let seed = 3; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  const sky = NIGHT ? ["#0a1222", "#0f1c33"] : ["#e9f1f4", "#c6dbe5"];
  const g = sctx.createLinearGradient(0, 0, 0, sy); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  sctx.fillStyle = g; sctx.fillRect(0, 0, W, sy);
  if (NIGHT) { seed = 77; sctx.fillStyle = "rgba(255,250,235,.8)"; for (let i = 0; i < 90; i++) { sctx.beginPath(); sctx.arc(rnd() * W, rnd() * sy * .7, .6 + rnd(), 0, 6.28); sctx.fill(); } }
  sctx.fillStyle = NIGHT ? "rgba(220,230,240,.85)" : "rgba(255,252,240,.9)"; sctx.beginPath(); sctx.arc(W * (NIGHT ? .72 : .5), sy * .5, sy * (NIGHT ? .2 : .36), 0, 6.28); sctx.fill();
  const mount = NIGHT ? ["#182a44", "#121f36", "#0d172a"] : ["#bcd5de", "#9ec0cd", "#7faabb"];
  [[.62, 3], [.48, 11], [.34, 5]].forEach((r, idx) => {
    sctx.fillStyle = mount[idx]; sctx.beginPath(); sctx.moveTo(0, sy); seed = r[1]; let x = 0; sctx.lineTo(0, sy - sy * r[0] * .5);
    while (x < W) { const step = 60 + rnd() * 160; const peak = sy - sy * r[0] * (.45 + rnd() * .55); x += step / 2; sctx.lineTo(x, peak); x += step / 2; sctx.lineTo(x, sy - sy * r[0] * (.25 + rnd() * .3)); }
    sctx.lineTo(W, sy); sctx.closePath(); sctx.fill();
  });
  const water = NIGHT ? [[0, [16, 44, 70]], [.15, [10, 30, 54]], [.4, [6, 18, 36]], [.75, [3, 9, 20]], [1, [1, 4, 10]]] : [[0, [70, 178, 206]], [.12, [44, 140, 174]], [.35, [26, 92, 132]], [.7, [14, 48, 86]], [1, [6, 18, 38]]];
  const wg = sctx.createLinearGradient(0, sy, 0, H); water.forEach(s => wg.addColorStop(s[0], rgb(s[1])));
  sctx.fillStyle = wg; sctx.fillRect(0, sy, W, H - sy);
  const bands = NIGHT ? [[150, 200, 220], [90, 150, 180], [40, 90, 120], [20, 50, 80], [10, 30, 50]] : [[236, 248, 250], [160, 220, 235], [80, 176, 204], [36, 116, 156], [18, 64, 100]];
  const bandAlpha = NIGHT ? .22 : .5;
  seed = 11; let x = -10, i2 = 0; const tones = [0, 1, 2, 1, 3, 2, 4, 1, 0, 2, 3, 1, 2, 4, 0, 3];
  while (x < W + 10) {
    let w = 6 + rnd() * 48; if (rnd() < .2) w += 36;
    const tone = tones[i2 % tones.length], c = bands[tone], a0 = bandAlpha * (tone <= 1 ? 1 : .7);
    const lg = sctx.createLinearGradient(0, sy, 0, H); lg.addColorStop(0, rgb(c, a0)); lg.addColorStop(.35, rgb(c, a0 * .45)); lg.addColorStop(1, rgb(c, .04));
    sctx.fillStyle = lg; sctx.fillRect(x, sy, w, H - sy); x += w + 4 + rnd() * 30; i2++;
  }
  const sb = sctx.createLinearGradient(0, sy, 0, sy + 90); sb.addColorStop(0, "rgba(255,255,255,.6)"); sb.addColorStop(1, "rgba(255,255,255,0)");
  sctx.fillStyle = sb; sctx.fillRect(0, sy, W, 90); sctx.fillStyle = "rgba(255,255,255,.85)"; sctx.fillRect(0, sy - 1, W, 2);
  if (NIGHT) { const mg = sctx.createLinearGradient(0, sy, 0, H); mg.addColorStop(0, "rgba(200,225,240,.28)"); mg.addColorStop(1, "rgba(200,225,240,0)"); sctx.fillStyle = mg; sctx.beginPath(); sctx.moveTo(W * .62, sy); sctx.lineTo(W * .82, sy); sctx.lineTo(W * .95, H); sctx.lineTo(W * .5, H); sctx.closePath(); sctx.fill(); }
  sctx.fillStyle = NIGHT ? "#04101e" : "#071a2e"; sctx.beginPath(); sctx.moveTo(0, H * .78); sctx.lineTo(W * .08, H * .74); sctx.lineTo(W * .16, H * .8); sctx.lineTo(W * .24, H * .77); sctx.lineTo(W * .3, H * .86); sctx.lineTo(W * .36, H); sctx.lineTo(0, H); sctx.closePath(); sctx.fill();
  sctx.strokeStyle = "#e0604a"; sctx.lineWidth = 2; sctx.lineCap = "round"; for (let c1 = 0; c1 < 7; c1++) { const a = -Math.PI / 2 + (c1 - 3) * .28; sctx.beginPath(); sctx.moveTo(W * .1, H * .74); sctx.lineTo(W * .1 + Math.cos(a) * 16, H * .74 + Math.sin(a) * 16); sctx.stroke(); }
  sctx.strokeStyle = "#5fd3a2"; for (let c2 = 0; c2 < 6; c2++) { const b2 = -Math.PI / 2 + (c2 - 2.5) * .34; sctx.beginPath(); sctx.moveTo(W * .2, H * .78); sctx.quadraticCurveTo(W * .2 + Math.cos(b2) * 10, H * .78 + Math.sin(b2) * 10 - 4, W * .2 + Math.cos(b2) * 18, H * .78 + Math.sin(b2) * 18); sctx.stroke(); }

  return sy;
}
