/* WALL-E Junior in 3D, rebuilt from the project photos and the CAD images (proportions are approximate).
   The robot faces +z and its 5-DOF arm hangs on its right side (-x); 1 unit is about 50 cm, the body width.
   Three bins sit at the back under openings in the lid. It stands on a turntable: drag to turn it, move the
   pointer and the head and arm follow, click to wave, and "Sort an item" plays the real task: search, detect,
   grasp, check for metal, drop it in its bin. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const stage = document.getElementById("stage");
const canvas = document.getElementById("robot-canvas");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = Math.min(screen.width, screen.height) < 700;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  stage.classList.add("no-webgl");
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
const LOOK = new THREE.Vector3(-0.3, 0.9, 0);
const CAM_DIR = new THREE.Vector3(-0.34, 0.27, 1).normalize();

/* studio lighting: a warm key with soft shadows, a cool fill, and two coloured rims that pick the black arm
   out of the dark page */
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x0b0d12, 0.45));
const key = new THREE.DirectionalLight(0xfff2e2, 2.6);
key.position.set(2.4, 4.6, 3.4);
key.castShadow = true;
key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -2.3, right: 2.3, top: 2.8, bottom: -1.4, near: 0.5, far: 12 });
key.shadow.camera.updateProjectionMatrix();
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
const fill = new THREE.DirectionalLight(0xc6d8ff, 0.55); fill.position.set(3.5, 1.2, 2.5); scene.add(fill);
const rimO = new THREE.DirectionalLight(0xff8a1f, 2.4); rimO.position.set(-3.6, 2.4, -2.4); scene.add(rimO);
const rimC = new THREE.DirectionalLight(0x3ddcff, 1.7); rimC.position.set(3.4, 2.8, -3.2); scene.add(rimC);

/* ---------- procedural textures ---------- */
function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function canvasTex(w, h, draw, repeat, srgb){
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}
function speckle(base, colors, n, size, seed){
  return function(g, w, h){
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++){
      g.fillStyle = colors[(r() * colors.length) | 0];
      g.globalAlpha = 0.35 + r() * 0.5;
      g.beginPath();
      g.ellipse(r() * w, r() * h, size * (0.4 + r()), size * (0.3 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  };
}
// chipboard: pressed wood flakes, the colour of the real frame
const texChip = canvasTex(512, 512, function(g, w, h){
  const r = rng(3), cols = ["#c38c47", "#e6bd7a", "#b47a3a", "#efcd93", "#a86f33", "#dcae68"];
  g.fillStyle = "#d8a65e"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++){
    g.fillStyle = cols[(r() * cols.length) | 0]; g.globalAlpha = 0.45 + r() * 0.5;
    g.save(); g.translate(r() * w, r() * h); g.rotate(r() * Math.PI);
    g.fillRect(-(3 + r() * 9), -(1 + r() * 2.5), 6 + r() * 18, 2 + r() * 5);
    g.restore();
  }
  g.globalAlpha = 0.55;
  for (let i = 0; i < 600; i++){ g.fillStyle = r() > 0.5 ? "#7a4f22" : "#5e3c1a"; g.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6); }
  g.globalAlpha = 1;
});
const texMDF = canvasTex(256, 256, speckle("#e6e2da", ["#d9d4ca", "#efece6", "#dcd7cd"], 1600, 1.4, 7), [2, 2]);
const texTop = canvasTex(256, 256, speckle("#34363b", ["#40434a", "#2a2c30", "#4a4d53"], 1500, 2.2, 5), [2, 2]);
const texGrain = canvasTex(256, 256, speckle("#808080", ["#707070", "#909090", "#7a7a7a", "#888888"], 5000, 1.1, 13), [4, 4], false);
const texFoam = canvasTex(128, 128, speckle("#9d9d9d", ["#6d6d6d", "#bcbcbc", "#858585"], 1200, 1.7, 9), [1.6, 1]);
const texHose = canvasTex(32, 8, function(g, w, h){ g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 4, h); }, [70, 1], false);
const texPCB = canvasTex(256, 256, function(g, w, h){
  const r = rng(21);
  g.fillStyle = "#1d6b3a"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#3b9a5c"; g.lineWidth = 2;
  for (let i = 0; i < 46; i++){
    let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++){ if (r() > 0.5) x += (r() - 0.5) * 120; else y += (r() - 0.5) * 120; g.lineTo(x, y); }
    g.stroke();
  }
  g.fillStyle = "#d9c27a"; for (let i = 0; i < 110; i++) g.fillRect(r() * w, r() * h, 4, 4);
  g.fillStyle = "#121212"; for (let i = 0; i < 14; i++) g.fillRect(r() * w, r() * h, 16 + r() * 34, 10 + r() * 20);
});
const texLabel = canvasTex(256, 128, function(g, w, h){
  g.fillStyle = "#16171a"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#e9e9e9"; g.font = "700 40px Arial, sans-serif"; g.textAlign = "center"; g.fillText("MG996R", w / 2, 62);
  g.font = "400 20px Arial, sans-serif"; g.fillStyle = "#9a9da3"; g.fillText("METAL GEAR · DIGI HI TORQUE", w / 2, 98);
});
const texCan = canvasTex(256, 128, function(g, w, h){
  g.fillStyle = "#c62a30"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#f4f4f4"; g.beginPath(); g.moveTo(0, 70);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, 70 + Math.sin(x / 26) * 14);
  g.lineTo(w, 90); for (let x = w; x >= 0; x -= 8) g.lineTo(x, 90 + Math.sin(x / 26) * 14); g.fill();
});
const texBlob = canvasTex(128, 128, function(g, w, h){
  const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(0.5, "rgba(0,0,0,0.32)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const texPool = canvasTex(256, 256, function(g, w, h){
  const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
// the turntable dial: concentric rings and ticks, drawn faintly
const texDial = canvasTex(1024, 1024, function(g, w, h){
  const cx = w / 2, cy = h / 2;
  g.strokeStyle = "rgba(255,255,255,1)";
  [0.98, 0.9, 0.62, 0.36].forEach(function(f, i){ g.globalAlpha = i === 0 ? 0.55 : 0.22; g.lineWidth = i === 0 ? 3 : 1.5; g.beginPath(); g.arc(cx, cy, cx * f, 0, Math.PI * 2); g.stroke(); });
  for (let i = 0; i < 120; i++){
    const a = i / 120 * Math.PI * 2, long = i % 10 === 0;
    g.globalAlpha = long ? 0.6 : 0.3; g.lineWidth = long ? 3 : 1.5;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * cx * 0.92, cy + Math.sin(a) * cy * 0.92); g.lineTo(cx + Math.cos(a) * cx * (long ? 0.86 : 0.89), cy + Math.sin(a) * cy * (long ? 0.86 : 0.89)); g.stroke();
  }
  g.globalAlpha = 1;
}, null, false);

/* ---------- materials ---------- */
const M = {
  chip: new THREE.MeshStandardMaterial({ map: texChip, bumpMap: texChip, bumpScale: 0.35, roughness: 0.74 }),
  mdf: new THREE.MeshStandardMaterial({ map: texMDF, roughness: 0.82 }),
  top: new THREE.MeshStandardMaterial({ map: texTop, roughness: 0.86 }),
  acrylic: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.09, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.6, depthWrite: false, side: THREE.DoubleSide }),
  pla: new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.5, bumpMap: texGrain, bumpScale: 0.12 }),
  servo: new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.36 }),
  label: new THREE.MeshStandardMaterial({ map: texLabel, roughness: 0.5 }),
  orange: new THREE.MeshPhysicalMaterial({ color: 0xf08a24, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
  foam: new THREE.MeshStandardMaterial({ map: texFoam, color: 0x9a9a9a, bumpMap: texFoam, bumpScale: 1.1, roughness: 1, envMapIntensity: 0.5 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xdadde2, metalness: 1, roughness: 0.26 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xc3c8cd, metalness: 0.85, roughness: 0.4 }),
  chain: new THREE.MeshStandardMaterial({ color: 0x3a3b40, metalness: 0.85, roughness: 0.42 }),
  roller: new THREE.MeshStandardMaterial({ color: 0x9c9ea4, metalness: 0.9, roughness: 0.35 }),
  sprocket: new THREE.MeshStandardMaterial({ color: 0x1b1c20, metalness: 0.7, roughness: 0.34 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.85 }),
  hose: new THREE.MeshStandardMaterial({ color: 0x13785a, roughness: 0.45, bumpMap: texHose, bumpScale: 2.5 }),
  pcb: new THREE.MeshStandardMaterial({ map: texPCB, roughness: 0.5 }),
  uno: new THREE.MeshStandardMaterial({ color: 0x0f7f86, roughness: 0.5 }),
  ibt: new THREE.MeshStandardMaterial({ color: 0xb3262b, roughness: 0.5 }),
  terminal: new THREE.MeshStandardMaterial({ color: 0x2463d8, roughness: 0.45 }),
  sink: new THREE.MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.6, roughness: 0.45 }),
  motor: new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.28 }),
  gearbox: new THREE.MeshStandardMaterial({ color: 0x9ea3a9, metalness: 1, roughness: 0.38 }),
  battery: new THREE.MeshStandardMaterial({ color: 0x23408f, roughness: 0.55 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe9e9e9, roughness: 0.6 }),
  black: new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.6 }),
  pupil: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  pupilDark: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.5 }),
  sensorCap: new THREE.MeshStandardMaterial({ color: 0x1f7fd8, roughness: 0.35, emissive: 0x3ddcff, emissiveIntensity: 0 }),
  led: new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }),
  dial: new THREE.MeshBasicMaterial({ map: texDial, color: 0x3ddcff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
  ring: new THREE.MeshBasicMaterial({ color: 0xff8a1f, toneMapped: false }),
  pool: new THREE.MeshBasicMaterial({ map: texPool, color: 0x6f86b8, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }),
  bin: new THREE.MeshPhysicalMaterial({ color: 0x1b2438, roughness: 0.45, metalness: 0.25, clearcoat: 0.4, side: THREE.DoubleSide }),
  binBand: new THREE.MeshStandardMaterial({ color: 0x8a96a3, roughness: 0.4, emissive: 0x000000 }),
  can: new THREE.MeshStandardMaterial({ map: texCan, metalness: 0.6, roughness: 0.32 }),
  bottle: new THREE.MeshPhysicalMaterial({ color: 0x9fd3ff, roughness: 0.06, transparent: true, opacity: 0.5, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
  capBlue: new THREE.MeshStandardMaterial({ color: 0x1f5fd6, roughness: 0.4 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xece6d6, roughness: 0.95, flatShading: true }),
  jar: new THREE.MeshPhysicalMaterial({ color: 0x5fd09a, roughness: 0.05, transparent: true, opacity: 0.45, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
  lid: new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.3 }),
};
const WIRE = [0xd62d2d, 0x161616, 0xff8b1f, 0xe8c430, 0x2a62d8, 0xe9e9e9, 0x2f9e44, 0x7a4a26].map(function(c){ return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }); });

/* ---------- geometry helpers ---------- */
const turntable = new THREE.Group(); scene.add(turntable);
const robot = new THREE.Group(); turntable.add(robot);

function put(m, parent, x, y, z){ m.position.set(x || 0, y || 0, z || 0); (parent || robot).add(m); return m; }
function worldUV(g, w, h, d, s){
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++){ const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] * s, uv.getY(i) * dims[f][1] * s); }
}
function box(w, h, d, mat, x, y, z, parent){ return put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent, x, y, z); }
function board(w, h, d, mat, x, y, z, parent, s){ const g = new THREE.BoxGeometry(w, h, d); worldUV(g, w, h, d, s || 2); return put(new THREE.Mesh(g, mat), parent, x, y, z); }
function rbox(w, h, d, r, mat, x, y, z, parent){ return put(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat), parent, x, y, z); }
function cyl(r, h, mat, axis, x, y, z, parent, seg, r2){
  const g = new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, h, seg || 40);
  if (axis === "x") g.rotateZ(Math.PI / 2); else if (axis === "z") g.rotateX(Math.PI / 2);
  return put(new THREE.Mesh(g, mat), parent, x, y, z);
}
function tube(points, radius, mat, parent, closed){
  const curve = new THREE.CatmullRomCurve3(points.map(function(p){ return new THREE.Vector3(p[0], p[1], p[2]); }), !!closed);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), radius, 8, !!closed), mat);
  (parent || robot).add(m); return m;
}
function plate(shape, depth, mat, parent, z, bevel){
  const b = bevel === undefined ? 0.006 : bevel;
  const g = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 40 });
  g.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(g, mat); m.position.z = z || 0; (parent || robot).add(m); return m;
}
// a link as printed: two round ends (r0 at the origin, r1 at (0, len)) joined by tangent edges
function linkShape(r0, r1, len){
  const a = Math.asin((r0 - r1) / len), s = new THREE.Shape();
  s.moveTo(r0 * Math.cos(a), r0 * Math.sin(a));
  s.lineTo(r1 * Math.cos(a), len + r1 * Math.sin(a));
  s.absarc(0, len, r1, a, Math.PI - a, false);
  s.lineTo(-r0 * Math.cos(a), r0 * Math.sin(a));
  s.absarc(0, 0, r0, Math.PI - a, Math.PI * 2 + a, false);
  return s;
}
function bolt(parent, x, y, z, r){ cyl(r || 0.008, 0.008, M.steel, "z", x, y, z, parent, 6); }
// one MG996R as it shows on a printed part: tabs and screws on the face, the body sunk into the part
function servo(parent, x, y, z, rz){
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rz || 0; parent.add(g);
  rbox(0.081, 0.04, 0.05, 0.004, M.servo, 0, 0, -0.022, g);
  rbox(0.108, 0.04, 0.008, 0.003, M.servo, 0, 0, 0.004, g);
  [[-0.047, -0.012], [-0.047, 0.012], [0.047, -0.012], [0.047, 0.012]].forEach(function(p){ cyl(0.0045, 0.006, M.steel, "z", p[0], p[1], 0.01, g, 10); });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.026), M.label); lab.position.set(-0.008, 0, 0.0086); g.add(lab);
  cyl(0.012, 0.012, M.servo, "z", 0.026, 0, 0.012, g, 24);
  [[WIRE[7], -0.006], [WIRE[0], 0], [WIRE[2], 0.006]].forEach(function(w){ tube([[-0.054, w[1], 0.0], [-0.075, w[1] * 1.5, 0.004], [-0.1, w[1] * 2 - 0.01, 0.01]], 0.0028, w[0], g); });
  return g;
}

/* ---------- more materials for the inside ---------- */
Object.assign(M, {
  pca: new THREE.MeshStandardMaterial({ color: 0x1f4fbf, roughness: 0.5 }),
  header: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9b45a, metalness: 1, roughness: 0.3 }),
  coil: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.4, roughness: 0.5 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x2a6fd8, roughness: 0.4 }),
  bms: new THREE.MeshStandardMaterial({ color: 0x5b2a86, roughness: 0.5 }),
  shrink: new THREE.MeshStandardMaterial({ color: 0x1e2c5c, roughness: 0.6 }),
  cell: new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.45 }),
  binPlastic: new THREE.MeshPhysicalMaterial({ color: 0x30363f, roughness: 0.55, clearcoat: 0.2 }),
  camBlack: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.4 }),
  lens: new THREE.MeshPhysicalMaterial({ color: 0x0a0d14, roughness: 0.05, metalness: 0.2, clearcoat: 1 }),
});

/* ---------- the body: a chipboard frame, acrylic front door, a lid with three openings over the rear bins ---------- */
const W = 1.0, H = 1.18, D = 0.9, Y0 = 0.12, B = 0.05;
const YC = Y0 + H / 2, YS = Y0 + H * 0.47, LID = Y0 + H + 0.03, FLOOR = Y0 + 0.039;
// frame
[-1, 1].forEach(function(sx){ [-1, 1].forEach(function(sz){ board(B, H, B, M.chip, sx * (W / 2 - B / 2), YC, sz * (D / 2 - B / 2)); }); });
[Y0 + B / 2, Y0 + H - B / 2].forEach(function(y){
  [-1, 1].forEach(function(s){
    board(W - 2 * B, B, B, M.chip, 0, y, s * (D / 2 - B / 2));
    board(B, B, D - 2 * B, M.chip, s * (W / 2 - B / 2), y, 0);
  });
});
board(W - 2 * B, 0.035, 0.03, M.chip, 0, YS - 0.03, D / 2 - 0.04);
// back, sides, floor and the middle shelf
board(W - 2 * B, H - 2 * B, 0.018, M.chip, 0, YC, -D / 2 + 0.03);
board(0.018, H - 2 * B, D - 2 * B, M.chip, -W / 2 + 0.03, YC, 0);
board(0.018, H - 2 * B, D - 2 * B, M.chip, W / 2 - 0.03, YC, 0);
board(W - 2 * B, 0.018, D - 2 * B, M.chip, 0, Y0 + 0.03, 0);
board(W - 2 * B, 0.02, D - 2 * B, M.mdf, 0, YS, 0, null, 1);
const SHELF = YS + 0.01;
// the lid: three openings along the back edge, one over each bin
const BINS = [-0.29, 0, 0.29].map(function(x, i){ return { x: x, z: -0.265, w: 0.2, d: 0.2, n: i + 1 }; });
const lidShape = new THREE.Shape(), LW = W + 0.012, LD = D + 0.012;
lidShape.moveTo(-LW / 2, -LD / 2); lidShape.lineTo(LW / 2, -LD / 2); lidShape.lineTo(LW / 2, LD / 2); lidShape.lineTo(-LW / 2, LD / 2); lidShape.closePath();
BINS.forEach(function(b){
  const h = new THREE.Path(), y = -b.z;
  h.moveTo(b.x - b.w / 2, y - b.d / 2); h.lineTo(b.x - b.w / 2, y + b.d / 2); h.lineTo(b.x + b.w / 2, y + b.d / 2); h.lineTo(b.x + b.w / 2, y - b.d / 2); h.closePath();
  lidShape.holes.push(h);
});
const lidGeo = new THREE.ExtrudeGeometry(lidShape, { depth: 0.03, bevelEnabled: false });
lidGeo.rotateX(-Math.PI / 2);
put(new THREE.Mesh(lidGeo, M.top), robot, 0, Y0 + H, 0);
BINS.forEach(function(b){
  // a chipboard collar lines each opening, as on the robot
  board(b.w, 0.07, 0.012, M.chip, b.x, LID - 0.05, b.z + b.d / 2 - 0.006);
  board(b.w, 0.07, 0.012, M.chip, b.x, LID - 0.05, b.z - b.d / 2 + 0.006);
  board(0.012, 0.07, b.d, M.chip, b.x - b.w / 2 + 0.006, LID - 0.05, b.z);
  board(0.012, 0.07, b.d, M.chip, b.x + b.w / 2 - 0.006, LID - 0.05, b.z);
  // the bin: an open plastic box on the shelf, under its opening; it lifts out to be emptied
  const g = new THREE.Group(); g.position.set(b.x, SHELF, -0.27); robot.add(g);
  const bw = 0.27, bd = 0.26, bh = 0.5;
  box(bw, 0.008, bd, M.binPlastic, 0, 0.004, 0, g);
  [-1, 1].forEach(function(s){ box(bw, bh, 0.008, M.binPlastic, 0, bh / 2, s * bd / 2, g); box(0.008, bh, bd, M.binPlastic, s * bw / 2, bh / 2, 0, g); });
  box(bw + 0.012, 0.014, 0.012, M.binPlastic, 0, bh, bd / 2, g); box(bw + 0.012, 0.014, 0.012, M.binPlastic, 0, bh, -bd / 2, g);
  box(0.09, 0.05, 0.003, M.white, 0, bh - 0.08, bd / 2 + 0.006, g);
  b.group = g; b.floor = SHELF + 0.01;
});
// acrylic door, hinged on the left edge as you face it, with screws on the frame
const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), M.acrylic);
glass.position.set(0, YC, D / 2 + 0.004); robot.add(glass);
[0.25, 0.75].forEach(function(f){
  const y = Y0 + H * f;
  box(0.006, 0.1, 0.05, M.steel, W / 2 + 0.003, y, D / 2 - 0.022);
  box(0.05, 0.1, 0.006, M.steel, W / 2 - 0.022, y, D / 2 + 0.008);
  cyl(0.008, 0.1, M.steel, null, W / 2 + 0.004, y, D / 2 + 0.006, null, 16);
});
[[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function(p){
  [0.08, 0.5, 0.92].forEach(function(f){ bolt(robot, p[0] * (W / 2 - B / 2), Y0 + H * f, p[1] > 0 ? D / 2 + 0.002 : -D / 2 - 0.002, 0.006); });
});
// two small LED strips light the compartments, so the parts read through the acrylic
[[1.22, 0.9], [YS - 0.06, 0.7]].forEach(function(p){
  const l = new THREE.PointLight(0xfff1df, p[1], 1.3, 1.6); l.position.set(0.05, p[0], 0.2); robot.add(l);
  box(0.5, 0.006, 0.012, M.pupil, 0, p[0] + 0.03, 0.36);
});

/* ---------- the inside: logic and power on the shelf, motors, camera and drivers below ---------- */
const ARM_Y = 1.0;   // the shoulder's height, read off the front photo
function pcb(w, d, mat, x, y, z, parent){ return box(w, 0.006, d, mat || M.pcb, x, y + 0.003, z, parent); }
function standoffs(w, d, x, y, z){ [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function(s){ cyl(0.004, 0.02, M.gold, null, x + s[0] * (w / 2 - 0.008), y + 0.01, z + s[1] * (d / 2 - 0.008), null, 6); }); }
// the J1 servo housing: the arm's base cup comes through the right wall
cyl(0.135, 0.3, M.pla, "x", -0.31, ARM_Y, 0.14, null, 48);
cyl(0.142, 0.02, M.pla, "x", -0.165, ARM_Y, 0.14, null, 48);
// Raspberry Pi 5 with its active cooler, on an aluminium shield plate, front centre of the shelf
box(0.2, 0.004, 0.14, M.alu, 0.08, SHELF + 0.002, 0.18);
standoffs(0.17, 0.112, 0.08, SHELF + 0.004, 0.18);
const pi = new THREE.Group(); pi.position.set(0.08, SHELF + 0.024, 0.18); robot.add(pi);
pcb(0.17, 0.112, M.pcb, 0, 0, 0, pi);
box(0.062, 0.014, 0.062, M.black, -0.02, 0.013, 0, pi);
for (let i = 0; i < 9; i++) box(0.004, 0.012, 0.05, M.sink, -0.046 + i * 0.0065, 0.026, 0, pi);
cyl(0.02, 0.006, M.servo, null, -0.02, 0.034, 0, pi, 20);
[[0.075, 0.034, 0.03], [0.075, 0.03, -0.012], [0.075, 0.034, -0.044]].forEach(function(p){ box(0.03, p[1], 0.03, M.steel, p[0], 0.019, p[2], pi); });
box(0.012, 0.012, 0.03, M.black, -0.08, 0.008, 0.035, pi);
for (let i = 0; i < 20; i++) box(0.003, 0.008, 0.003, M.gold, -0.06 + i * 0.006, 0.008, -0.05, pi);
// PCA9685 servo driver with its rows of headers
const pca = new THREE.Group(); pca.position.set(-0.22, SHELF + 0.02, 0.27); robot.add(pca);
standoffs(0.124, 0.05, -0.22, SHELF, 0.27);
pcb(0.124, 0.05, M.pca, 0, 0, 0, pca);
for (let i = 0; i < 16; i++) box(0.0055, 0.012, 0.018, M.header, -0.05 + i * 0.0066, 0.012, 0.008, pca);
box(0.03, 0.012, 0.012, M.terminal, 0.045, 0.012, -0.018, pca);
// the two 6 V / 8 A buck converters for the servos
[0.09, 0.3].forEach(function(z){
  const g = new THREE.Group(); g.position.set(0.33, SHELF + 0.02, z); robot.add(g);
  pcb(0.1, 0.06, M.pcb, 0, 0, 0, g);
  cyl(0.016, 0.022, M.coil, null, -0.02, 0.017, 0.01, g, 18);
  box(0.03, 0.03, 0.035, M.sink, 0.025, 0.02, 0.0, g);
  box(0.012, 0.012, 0.012, M.trim, -0.035, 0.012, -0.02, g);
  cyl(0.01, 0.018, M.black, null, -0.04, 0.015, 0.02, g, 12);
});
// terminal blocks along the shelf's front edge, wired to everything
function terminalBlock(x, z, n){
  box(0.026 * n, 0.045, 0.05, M.terminal, x, SHELF + 0.0225, z);
  for (let i = 0; i < n; i++) cyl(0.006, 0.006, M.steel, null, x - 0.013 * (n - 1) + i * 0.026, SHELF + 0.047, z, null, 10);
}
terminalBlock(-0.12, 0.37, 6); terminalBlock(0.2, 0.37, 5);
// the cooling fan on the left wall
const fan = new THREE.Group(); fan.position.set(W / 2 - 0.06, Y0 + H * 0.82, 0.12); robot.add(fan);
rbox(0.03, 0.17, 0.17, 0.008, M.black, 0, 0, 0, fan);
const blades = new THREE.Group(); blades.position.x = -0.02; fan.add(blades);
for (let i = 0; i < 7; i++){ const p = new THREE.Group(); p.rotation.x = i / 7 * Math.PI * 2; box(0.006, 0.065, 0.03, M.servo, 0, 0.038, 0, p); blades.add(p); }
cyl(0.024, 0.014, M.servo, "x", -0.022, 0, 0, fan, 24);
// lower compartment: four 12 V gear motors in clamps, one beside each sprocket
function gearMotor(x, z, dir){
  const g = new THREE.Group(); g.position.set(x, FLOOR + 0.055, z); g.scale.x = dir; robot.add(g);
  cyl(0.05, 0.17, M.motor, "x", 0, 0, 0, g, 32);
  cyl(0.046, 0.07, M.gearbox, "x", 0.12, 0, 0, g, 32);
  cyl(0.05, 0.022, M.black, "x", -0.096, 0, 0, g, 32);
  cyl(0.008, 0.24, M.steel, "x", 0.27, 0, 0, g, 12);
  box(0.03, 0.006, 0.12, M.alu, 0.0, -0.052, 0, g);
  tube([[-0.04, 0.055, 0.0], [-0.03, 0.06, 0.03], [0.04, 0.06, 0.03]], 0.004, M.alu, g);
  tube([[-0.108, 0.01, 0.02], [-0.13, 0.06, 0.05], [-0.1, 0.18, 0.08]], 0.004, WIRE[0], g);
  tube([[-0.108, -0.01, 0.02], [-0.135, 0.05, 0.07], [-0.12, 0.19, 0.1]], 0.004, WIRE[1], g);
}
gearMotor(-0.18, 0.3, -1); gearMotor(0.18, 0.3, 1); gearMotor(-0.18, -0.3, -1); gearMotor(0.18, -0.3, 1);
// Pi Camera Module 3 on the motor floor, in the middle, looking out through the acrylic
const cam = new THREE.Group(); cam.position.set(0, FLOOR + 0.07, D / 2 - 0.09); cam.rotation.x = 0.28; robot.add(cam);
box(0.05, 0.07, 0.04, M.black, 0, -0.035, -0.02, cam);
box(0.05, 0.05, 0.004, M.pcb, 0, 0.02, 0.002, cam);
box(0.022, 0.022, 0.012, M.camBlack, 0, 0.022, 0.01, cam);
cyl(0.0085, 0.008, M.camBlack, "z", 0, 0.022, 0.019, cam, 24);
cyl(0.006, 0.002, M.lens, "z", 0, 0.022, 0.0235, cam, 24);
tube([[0, 0.045, 0.0], [0, 0.09, -0.04], [0.02, 0.2, -0.1], [0.06, YS - FLOOR - 0.1, -0.2]], 0.0035, M.white, cam);
// battery packs with their BMS boards, centre back
box(0.16, 0.085, 0.1, M.shrink, 0.0, FLOOR + 0.043, -0.1);
box(0.1, 0.05, 0.075, M.cell, -0.2, FLOOR + 0.025, -0.08);
pcb(0.07, 0.04, M.bms, 0.0, FLOOR + 0.086, -0.1);
pcb(0.05, 0.03, M.bms, -0.2, FLOOR + 0.051, -0.08);
// on the back board: Arduino UNO and the two IBT-2 motor drivers
board(0.74, 0.42, 0.012, M.mdf, 0, Y0 + 0.37, -D / 2 + 0.05, null, 1);
const backZ = -D / 2 + 0.06;
const uno = new THREE.Group(); uno.position.set(-0.2, Y0 + 0.43, backZ); uno.rotation.x = Math.PI / 2; robot.add(uno);
pcb(0.138, 0.106, M.uno, 0, 0, 0, uno);
box(0.03, 0.022, 0.036, M.steel, -0.06, 0.014, -0.03, uno);
box(0.02, 0.022, 0.03, M.black, -0.062, 0.014, 0.03, uno);
box(0.07, 0.01, 0.01, M.black, 0.01, 0.008, -0.045, uno); box(0.1, 0.01, 0.01, M.black, 0.0, 0.008, 0.045, uno);
box(0.04, 0.01, 0.012, M.black, 0.02, 0.008, 0.0, uno);
[0.06, 0.24].forEach(function(x){
  box(0.1, 0.06, 0.008, M.ibt, x, Y0 + 0.43, backZ);
  for (let i = 0; i < 7; i++) box(0.006, 0.05, 0.038, M.sink, x - 0.042 + i * 0.014, Y0 + 0.43, backZ + 0.024);
  cyl(0.004, 0.004, M.led, "z", x - 0.045, Y0 + 0.457, backZ + 0.006, null, 8);
  box(0.03, 0.015, 0.012, M.terminal, x + 0.03, Y0 + 0.395, backZ + 0.008);
});
// the wiring: bundles between the boards, the motors, the camera and the shelf
(function(){
  const r = rng(77);
  const ends = [[-0.12, SHELF + 0.04, 0.37], [0.2, SHELF + 0.04, 0.37], [0.33, SHELF + 0.04, 0.09], [0.33, SHELF + 0.04, 0.3], [0.08, SHELF + 0.03, 0.18],
    [-0.22, SHELF + 0.03, 0.27], [-0.2, Y0 + 0.45, backZ + 0.01], [0.06, Y0 + 0.45, backZ + 0.01], [0.24, Y0 + 0.45, backZ + 0.01], [0.0, FLOOR + 0.09, -0.1], [-0.2, FLOOR + 0.06, -0.08]];
  for (let i = 0; i < 34; i++){
    const a = ends[(r() * ends.length) | 0], b = ends[(r() * ends.length) | 0];
    if (a === b) continue;
    const mid = [(a[0] + b[0]) / 2 + (r() - 0.5) * 0.25, Math.min(a[1], b[1]) - 0.03 - r() * 0.12, (a[2] + b[2]) / 2 + (r() - 0.5) * 0.2];
    mid[1] = Math.max(mid[1], FLOOR + 0.02);
    tube([a, [a[0], a[1] + 0.02, a[2] + 0.02], mid, [b[0], b[1] + 0.02, b[2] + 0.02], b], 0.0034, WIRE[(r() * 7) | 0]);
  }
  // servo leads leave the PCA9685 for the arm through the cup
  [[WIRE[2], 0], [WIRE[0], 0.008], [WIRE[7], 0.016]].forEach(function(w){
    tube([[-0.22 + w[1], SHELF + 0.03, 0.27], [-0.25 + w[1], SHELF + 0.09, 0.22], [-0.3 + w[1], ARM_Y - 0.12, 0.16], [-0.34, ARM_Y - 0.05, 0.12]], 0.0034, w[0]);
  });
  for (let i = 0; i < 6; i++){
    const x = -0.12 + i * 0.012, z = 0.3 + i * 0.004;
    tube([[x, SHELF + 0.05, z], [x + 0.03, SHELF - 0.12, z + 0.02], [x + 0.08, FLOOR + 0.1, z - 0.1]], 0.004, M.white);
  }
  [0.25, 0.5].forEach(function(t){ cyl(0.011, 0.006, M.white, null, -0.1 + t * 0.06, SHELF - 0.05 - t * 0.2, 0.31, null, 12); });
})();

/* ---------- head: a bracket, a flat neck, and the two eyes as mirror images ---------- */
const head = new THREE.Group(); head.position.set(0, LID, 0.06); robot.add(head);
rbox(0.13, 0.05, 0.09, 0.008, M.orange, 0, 0.025, 0, head);
[[-0.045, -0.03], [0.045, -0.03], [-0.045, 0.03], [0.045, 0.03]].forEach(function(p){ cyl(0.006, 0.006, M.steel, null, p[0], 0.052, p[1], head, 10); });
rbox(0.072, 0.21, 0.03, 0.006, M.orange, 0, 0.14, 0, head);
const neckTop = new THREE.Group(); neckTop.position.y = 0.235; head.add(neckTop);
// one eye, traced from the photos: a straight inner edge against the other eye, a flat top, a big round outer end
const eyeShape = new THREE.Shape();
eyeShape.moveTo(0, -0.005);
eyeShape.lineTo(0, 0.19);
eyeShape.bezierCurveTo(0.1, 0.2, 0.22, 0.195, 0.3, 0.17);
eyeShape.bezierCurveTo(0.37, 0.15, 0.375, 0.05, 0.33, 0.0);
eyeShape.bezierCurveTo(0.27, -0.07, 0.12, -0.08, 0.04, -0.04);
eyeShape.quadraticCurveTo(0.01, -0.025, 0, -0.005);
const EYE_T = 0.03;
const eyeGeo = new THREE.ExtrudeGeometry(eyeShape, { depth: EYE_T, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 48 });
eyeGeo.translate(0, 0, -EYE_T / 2);
const eyes = [], pupils = [];
[1, -1].forEach(function(side){
  const e = new THREE.Group();
  e.position.x = side * 0.004;
  e.scale.x = side;
  e.add(new THREE.Mesh(eyeGeo, M.orange));
  pupils.push(box(0.032, 0.058, 0.004, M.pupil, 0.11, 0.115, EYE_T / 2 + 0.008, e));
  neckTop.add(e); eyes.push(e);
});

/* ---------- tracks: two bicycle chains per side over three sprockets (rear, front and a tensioner on the top run),
   foam pads on aluminium plates ---------- */
const RC = 0.19, RT = 0.075, CH_X = 0.13, PAD_OFF = 0.052, PAD_T = 0.08, TL = 0.62;
const TYC = RC + PAD_OFF + PAD_T / 2;
const SPROCKETS = [{ u: -TL / 2, v: TYC, r: RC, teeth: 22 }, { u: 0, v: TYC + RC + 0.04 - RT, r: RT, teeth: 10 }, { u: TL / 2, v: TYC, r: RC, teeth: 22 }];
const TRACK_X = W / 2 + 0.04 + 0.15;
// a closed loop around the sprockets, travelled clockwise in (u = z, v = y); off pushes it outward (the pads sit outside the chain)
function buildLoop(off){
  const C = SPROCKETS.map(function(c){ return { u: c.u, v: c.v, r: c.r + off }; }), n = C.length, tang = [], segs = [];
  for (let i = 0; i < n; i++){
    const a = C[i], b = C[(i + 1) % n], du = b.u - a.u, dv = b.v - a.v, L = Math.hypot(du, dv);
    const d = [du / L, dv / L], pp = [-d[1], d[0]], sp = (a.r - b.r) / L, cp = Math.sqrt(1 - sp * sp);
    const nr = [cp * pp[0] + sp * d[0], cp * pp[1] + sp * d[1]];
    tang.push({ p0: [a.u + a.r * nr[0], a.v + a.r * nr[1]], p1: [b.u + b.r * nr[0], b.v + b.r * nr[1]], ang: Math.atan2(nr[1], nr[0]) });
  }
  let total = 0;
  for (let i = 0; i < n; i++){
    const t = tang[i], len = Math.hypot(t.p1[0] - t.p0[0], t.p1[1] - t.p0[1]);
    segs.push({ line: true, p0: t.p0, p1: t.p1, len: len, s0: total }); total += len;
    const c = C[(i + 1) % n], a0 = t.ang, a1 = tang[(i + 1) % n].ang;
    let da = a0 - a1; while (da < 0) da += Math.PI * 2; while (da >= Math.PI * 2) da -= Math.PI * 2;
    segs.push({ line: false, c: c, a0: a0, len: da * c.r, s0: total }); total += da * c.r;
  }
  return { segs: segs, total: total, at: function(s){
    s = ((s % total) + total) % total;
    for (let i = 0; i < segs.length; i++){
      const g = segs[i];
      if (s <= g.s0 + g.len || i === segs.length - 1){
        const k = s - g.s0;
        if (g.line){ const f = g.len ? k / g.len : 0, du = g.p1[0] - g.p0[0], dv = g.p1[1] - g.p0[1]; return [g.p0[0] + du * f, g.p0[1] + dv * f, Math.atan2(-dv, du)]; }
        const ph = g.a0 - k / g.c.r;
        return [g.c.u + g.c.r * Math.cos(ph), g.c.v + g.c.r * Math.sin(ph), Math.atan2(Math.cos(ph), Math.sin(ph))];
      }
    }
  } };
}
function gearGeo(rOut, teeth, toothDepth, thick){
  const s = new THREE.Shape(), n = teeth * 2;
  for (let i = 0; i < n; i++){
    const a0 = i / n * Math.PI * 2, a1 = (i + 0.7) / n * Math.PI * 2;
    const rr = i % 2 === 0 ? rOut : rOut - toothDepth;
    if (i === 0) s.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr); else s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  s.closePath();
  for (let k = 0; k < 5; k++){
    const a = k / 5 * Math.PI * 2, h = new THREE.Path();
    h.absarc(Math.cos(a) * rOut * 0.55, Math.sin(a) * rOut * 0.55, rOut * 0.2, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 16 });
  g.translate(0, 0, -thick / 2); g.rotateY(Math.PI / 2);
  return g;
}
const PADS = buildLoop(PAD_OFF), CHAIN = buildLoop(0);
const N_PADS = Math.round(PADS.total / 0.145), N_LINKS = Math.round(CHAIN.total / 0.0254), PITCH = CHAIN.total / N_LINKS;
const padGeo = new RoundedBoxGeometry(0.3, PAD_T, 0.12, 4, 0.034);
const plateGeo = new RoundedBoxGeometry(0.004, 0.017, PITCH + 0.008, 2, 0.002);
const rollerGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.014, 10); rollerGeo.rotateZ(Math.PI / 2);
const chainPlates = new THREE.InstancedMesh(plateGeo, M.chain, 4 * N_LINKS * 2);
const chainRollers = new THREE.InstancedMesh(rollerGeo, M.roller, 4 * N_LINKS);
chainPlates.castShadow = chainRollers.castShadow = true;
robot.add(chainPlates); robot.add(chainRollers);
const tracks = [];
[-1, 1].forEach(function(side){
  const g = new THREE.Group(); g.position.x = side * TRACK_X; robot.add(g);
  const pads = [];
  for (let i = 0; i < N_PADS; i++){
    const p = new THREE.Group();
    p.add(new THREE.Mesh(padGeo, M.foam));
    box(0.27, 0.006, 0.07, M.alu, 0, -PAD_T / 2 - 0.004, 0, p);
    [-CH_X, CH_X].forEach(function(x){ cyl(0.006, 0.012, M.steel, null, x, -PAD_T / 2 - 0.008, 0, p, 6); });
    g.add(p); pads.push(p);
  }
  const sprockets = [];
  SPROCKETS.forEach(function(sp, k){
    const geo = gearGeo(sp.r + 0.008, sp.teeth, 0.016, 0.012);
    [-CH_X, CH_X].forEach(function(ox){
      const m = new THREE.Mesh(geo, M.sprocket); m.position.set(ox, sp.v, sp.u); g.add(m); sprockets.push({ m: m, r: sp.r });
      cyl(k === 1 ? 0.018 : 0.03, 0.03, M.steel, "x", ox + Math.sign(ox) * 0.014, sp.v, sp.u, g, 20);
    });
    cyl(k === 1 ? 0.008 : 0.012, 0.3, M.steel, "x", 0, sp.v, sp.u, g, 12);
  });
  // the tensioner's slotted arm, bolted to the inner side plate
  rbox(0.03, 0.16, TL + 0.16, 0.01, M.black, -side * 0.165, TYC, 0, g);
  rbox(0.012, 0.11, 0.04, 0.004, M.alu, -side * 0.15, SPROCKETS[1].v - 0.04, 0, g);
  tracks.push({ group: g, pads: pads, sprockets: sprockets, s: 0, side: side });
});
const mtx = new THREE.Matrix4(), qtn = new THREE.Quaternion(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), axX = new THREE.Vector3(1, 0, 0);
function layoutTracks(){
  let pi = 0, ri = 0;
  tracks.forEach(function(t){
    for (let i = 0; i < N_PADS; i++){
      const q = PADS.at(t.s + i / N_PADS * PADS.total);
      t.pads[i].position.set(0, q[1], q[0]);
      t.pads[i].rotation.x = q[2];
    }
    const sc = t.s * CHAIN.total / PADS.total;
    t.sprockets.forEach(function(sp){ sp.m.rotation.x = sc / sp.r; });
    [-CH_X, CH_X].forEach(function(ox){
      for (let i = 0; i < N_LINKS; i++){
        const q = CHAIN.at(sc + i * PITCH), q2 = CHAIN.at(sc + (i + 0.5) * PITCH);
        qtn.setFromAxisAngle(axX, q2[2]);
        const x = t.side * TRACK_X + ox;
        [-0.0085, 0.0085].forEach(function(dx){
          pos.set(x + dx * (i % 2 ? 1 : 1.25), q2[1], q2[0]);
          chainPlates.setMatrixAt(pi++, mtx.compose(pos, qtn, one));
        });
        pos.set(x, q[1], q[0]);
        chainRollers.setMatrixAt(ri++, mtx.compose(pos, qtn, one));
      }
    });
  });
  chainPlates.instanceMatrix.needsUpdate = true;
  chainRollers.instanceMatrix.needsUpdate = true;
}

/* ---------- the 5-DOF arm on the right side (-x), six MG996R servos:
   J1 base swing about the cup's axis (x), J2 shoulder, J3 elbow, J4 wrist pitch, J5 wrist roll, then the gripper ---------- */
const L1 = 0.6, L2 = 0.64, PZ = 0.135, ROLL_Y = 0.055;
const GC = ROLL_Y + 0.095 + 0.08 + 0.045, GRIP = ROLL_Y + 0.095 + 0.08 + 0.09;
const armRoot = new THREE.Group(); armRoot.position.set(-W / 2 - 0.1, ARM_Y, 0.14); robot.add(armRoot);
// J1 housing: the cup's outer end and its flange on the wall (fixed)
cyl(0.135, 0.06, M.pla, "x", 0.07, 0, 0, armRoot, 48);
cyl(0.16, 0.014, M.pla, "x", 0.095, 0, 0, armRoot, 48);
for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; cyl(0.007, 0.01, M.steel, "x", 0.09, Math.cos(a) * 0.145, Math.sin(a) * 0.145, armRoot, 6); }
const svJ1 = servo(armRoot, 0.44, 0, 0, 0); svJ1.rotation.y = Math.PI / 2;
// J1 output: the yoke turns about x and carries the shoulder hub
const base = new THREE.Group(); armRoot.add(base);
cyl(0.12, 0.03, M.pla, "x", 0.03, 0, 0, base, 48);
for (let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2 + 0.4; cyl(0.007, 0.008, M.steel, "x", 0.012, Math.cos(a) * 0.09, Math.sin(a) * 0.09, base, 6); }
rbox(0.07, 0.24, 0.07, 0.012, M.pla, 0.0, 0, -0.035, base);
cyl(0.15, 0.07, M.pla, "z", -0.04, 0, 0, base, 64);
cyl(0.164, 0.012, M.pla, "z", -0.04, 0, 0.034, base, 64);
for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; bolt(base, -0.04 + Math.cos(a) * 0.155, Math.sin(a) * 0.155, 0.042, 0.006); }
// J2 shoulder
const shoulder = new THREE.Group(); shoulder.position.set(-0.04, 0, 0.02); base.add(shoulder);
plate(linkShape(0.135, 0.078, L1), 0.066, M.pla, shoulder, 0.075);
servo(shoulder, -0.026, 0, 0.115, 0);
servo(shoulder, 0.0, 0.28, 0.11, Math.PI / 2).scale.setScalar(0.9);
// J3 elbow
const elbow = new THREE.Group(); elbow.position.y = L1; shoulder.add(elbow);
cyl(0.07, 0.07, M.pla, "z", 0, 0, 0.1, elbow, 48);
plate(linkShape(0.07, 0.052, L2), 0.06, M.pla, elbow, PZ);
servo(elbow, -0.026, 0, PZ + 0.034, 0);
rbox(0.1, 0.13, 0.08, 0.012, M.pla, 0, L2 * 0.52, PZ, elbow);
[[-0.03, 0.04], [0.03, 0.04], [-0.03, -0.04], [0.03, -0.04]].forEach(function(p){ bolt(elbow, p[0], L2 * 0.52 + p[1], PZ + 0.042, 0.006); });
// J4 wrist pitch
const wrist = new THREE.Group(); wrist.position.y = L2; elbow.add(wrist);
rbox(0.085, 0.07, 0.07, 0.012, M.pla, 0, 0.0, PZ, wrist);
servo(wrist, -0.026, 0, PZ + 0.036, 0).scale.setScalar(0.85);
// J5 wrist roll: everything beyond turns about the gripper's long axis
const roll = new THREE.Group(); roll.position.set(0, ROLL_Y, PZ); wrist.add(roll);
cyl(0.034, 0.02, M.servo, null, 0, -0.012, 0, roll, 28);
cyl(0.012, 0.012, M.white, null, 0, 0.0, 0, roll, 16);
rbox(0.07, 0.03, 0.05, 0.008, M.pla, 0, 0.012, 0, roll);
const palm = new THREE.Shape();
palm.moveTo(-0.05, 0.015); palm.lineTo(0.05, 0.015); palm.lineTo(0.085, 0.07); palm.quadraticCurveTo(0.09, 0.095, 0.065, 0.095);
palm.lineTo(-0.065, 0.095); palm.quadraticCurveTo(-0.09, 0.095, -0.085, 0.07); palm.closePath();
plate(palm, 0.03, M.pla, roll, 0);
servo(roll, 0.012, 0.055, 0.022, 0).scale.setScalar(0.72);
const fingers = [];
[-1, 1].forEach(function(s){
  const f = new THREE.Group(); f.position.set(s * 0.03, 0.095, 0); roll.add(f);
  [-0.022, 0.022].forEach(function(dz){ rbox(0.02, 0.08, 0.008, 0.004, M.pla, 0, 0.04, dz, f); });
  bolt(f, 0, 0, 0.028, 0.009); bolt(f, 0, 0, -0.028, 0.009);
  const jaw = new THREE.Group(); jaw.position.y = 0.08; f.add(jaw);
  const js = new THREE.Shape();
  js.moveTo(-0.014, -0.012); js.lineTo(0.016, -0.012); js.lineTo(0.01, 0.09); js.lineTo(-0.006, 0.09); js.closePath();
  const jm = plate(js, 0.032, M.pla, jaw, 0, 0.004); jm.scale.x = -s;
  bolt(jaw, 0, 0, 0.022, 0.009);
  [0.028, 0.06].forEach(function(y){ cyl(0.007, 0.05, M.steel, "z", -s * 0.004, y, 0, jaw, 6); });
  fingers.push({ g: f, jaw: jaw, s: s });
});
// LJ12A3 inductive sensor beside the jaws, its cable looping back along the forearm
const sensor = new THREE.Group(); sensor.position.set(0.1, 0.03, -0.01); roll.add(sensor);
cyl(0.016, 0.12, M.steel, null, 0, 0, 0, sensor, 24);
cyl(0.017, 0.02, M.sensorCap, null, 0, 0.07, 0, sensor, 24);
[-0.02, 0.03].forEach(function(y){ cyl(0.022, 0.01, M.steel, null, 0, y, 0, sensor, 6); });
box(0.05, 0.03, 0.01, M.pla, -0.03, 0.0, 0.0, sensor);
tube([[0, -0.06, 0], [0.02, -0.14, 0.01], [-0.01, -0.24, 0.02], [-0.05, -0.32, 0.03]], 0.0045, M.rubber, sensor);
[[WIRE[2], 0], [WIRE[0], 0.009], [WIRE[7], 0.018]].forEach(function(w){
  tube([[0.035 + w[1], 0.04, 0.112], [0.05 + w[1], 0.22, 0.118], [0.03 + w[1], 0.42, 0.112], [0.045 + w[1], L1 - 0.03, 0.115]], 0.0042, w[0], shoulder);
  tube([[-0.03 - w[1], 0.03, PZ + 0.036], [-0.045 - w[1], 0.25, PZ + 0.038], [-0.03 - w[1], L2 - 0.03, PZ + 0.036]], 0.004, w[0], elbow);
});
// green corrugated conduit from the lid to the shoulder
tube([[-0.36, LID - 0.06, D / 2 - 0.02], [-0.52, LID + 0.02, D / 2 - 0.06], [-0.68, LID - 0.12, 0.34], [-0.66, ARM_Y + 0.1, 0.2]], 0.035, M.hose);
// where the arm plane sits: J1 turns it about the x axis through the shoulder
const AX = armRoot.position.x - 0.04, AY = armRoot.position.y, AZ = armRoot.position.z, PLANE = 0.02 + PZ;
const ARM_PLANE_Z = AZ + PLANE;

/* ---------- the turntable stage: a light pool that takes the real shadow, a faint dial and an orange ring ---------- */
const RING_R = 1.46;
const pool = new THREE.Mesh(new THREE.CircleGeometry(RING_R + 0.2, 96), M.pool); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.001; turntable.add(pool);
const catcher = new THREE.Mesh(new THREE.CircleGeometry(RING_R, 96), new THREE.ShadowMaterial({ opacity: 0.55 })); catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.002; catcher.receiveShadow = true; turntable.add(catcher);
const dial = new THREE.Mesh(new THREE.PlaneGeometry(RING_R * 2.04, RING_R * 2.04), M.dial); dial.rotation.x = -Math.PI / 2; dial.position.y = 0.0025; turntable.add(dial);
const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.006, 8, 220), M.ring); ring.rotation.x = Math.PI / 2; ring.position.y = 0.003; turntable.add(ring);
const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.0), new THREE.MeshBasicMaterial({ map: texBlob, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003; robot.add(blob);

/* ---------- waste items; each class has its bin (metal and glass share bin 1) ---------- */
function lathe(pts, mat){ return new THREE.Mesh(new THREE.LatheGeometry(pts.map(function(p){ return new THREE.Vector2(p[0], p[1]); }), 40), mat); }
const CLASSES = [
  { id: "metal", en: "METAL", ar: "معدن", bin: 0, w: 0.08, h: 0.14, make: function(g){
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 40), M.can), g, 0, 0.07, 0);
    cyl(0.036, 0.012, M.steel, null, 0, 0.136, 0, g, 40, 0.032); cyl(0.036, 0.012, M.steel, null, 0, 0.006, 0, g, 40, 0.04);
  } },
  { id: "plastic", en: "PLASTIC", ar: "بلاستيك", bin: 1, w: 0.074, h: 0.2, make: function(g){
    put(lathe([[0.001, 0], [0.034, 0.002], [0.037, 0.012], [0.037, 0.12], [0.03, 0.15], [0.015, 0.172], [0.014, 0.19], [0.001, 0.19]], M.bottle), g);
    cyl(0.016, 0.018, M.capBlue, null, 0, 0.195, 0, g, 20);
  } },
  { id: "paper", en: "PAPER", ar: "ورق", bin: 2, w: 0.1, h: 0.1, make: function(g){
    const geo = new THREE.IcosahedronGeometry(0.05, 2), p = geo.attributes.position, r = rng(5), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++){ v.fromBufferAttribute(p, i); v.multiplyScalar(0.8 + r() * 0.35); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    put(new THREE.Mesh(geo, M.paper), g, 0, 0.05, 0);
  } },
  { id: "glass", en: "GLASS", ar: "زجاج", bin: 0, w: 0.086, h: 0.135, make: function(g){
    put(lathe([[0.001, 0], [0.04, 0.002], [0.043, 0.012], [0.043, 0.09], [0.035, 0.102], [0.035, 0.118], [0.001, 0.118]], M.jar), g);
    cyl(0.037, 0.016, M.lid, null, 0, 0.126, 0, g, 32);
  } },
];
CLASSES.forEach(function(c){ c.grip = Math.asin(THREE.MathUtils.clamp((c.w / 2 - 0.014) / 0.08, 0, 0.9)); });

/* ---------- anchors for the drawing callouts, shadows ---------- */
function anchor(parent, x, y, z){ const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; }
const anchors = {
  elbow: anchor(elbow, 0, 0, 0.1),
  gripper: anchor(roll, 0, 0.2, 0),
  panel: anchor(robot, 0.08, SHELF + 0.06, 0.18),
  track: anchor(robot, TRACK_X, TYC + RC + PAD_OFF + 0.04, TL / 2 + 0.12),
  camera: anchor(cam, 0, 0.022, 0.02),
  bins: anchor(robot, BINS[2].x, LID + 0.03, BINS[2].z),
};
const noShadow = [M.acrylic, M.pupil, M.dial, M.pool, M.ring, M.bottle, M.jar];
robot.traverse(function(o){ if (o.isMesh && noShadow.indexOf(o.material) < 0 && o !== blob){ o.castShadow = true; o.receiveShadow = true; } });

/* ---------- motion planning: the arm's own kinematics, its joint limits, and everything it must not touch.
   Picking and dropping move the grasp point in straight lines; transfers go through collision-free via poses;
   every step of every move is checked before the arm is allowed to make it. ---------- */
const ARMP = {
  ROOT: [armRoot.position.x, AY, AZ], SH: [-0.04, 0.02], ZU: 0.075, ZF: PZ,
  // J1 base swing, J2 shoulder, J3 elbow, J4 wrist pitch, J5 wrist roll (rad)
  LIM: [[-1.25, 1.25], [-0.9, 2.7], [-2.45, 2.45], [-2.0, 2.0], [-1.7, 1.7]],
};
const TRACK_TOP = TYC + RC + PAD_OFF + PAD_T / 2 + 0.05, TRACK_END = TL / 2 + RC + PAD_OFF + PAD_T / 2;
const OBST = [
  { n: "body", min: [-W / 2 - 0.01, Y0 - 0.02, -D / 2 - 0.02], max: [W / 2 + 0.01, LID + 0.015, D / 2 + 0.02] },
  { n: "neck", min: [-0.07, LID, 0.0], max: [0.07, LID + 0.27, 0.12] },
  { n: "eyes", min: [-0.39, LID + 0.15, 0.0], max: [0.39, LID + 0.47, 0.12] },
  { n: "track", min: [-TRACK_X - 0.17, 0, -TRACK_END], max: [-TRACK_X + 0.17, TRACK_TOP, TRACK_END] },
  { n: "track", min: [TRACK_X - 0.17, 0, -TRACK_END], max: [TRACK_X + 0.17, TRACK_TOP, TRACK_END] },
  { n: "floor", min: [-9, -1, -9], max: [9, 0.004, 9] },
];
function wrapA(a){ while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function armToRobot(q1, xl, yl, zoff, out){
  const z = ARMP.SH[1] + zoff, c = Math.cos(q1), s = Math.sin(q1);
  out[0] = AX + xl; out[1] = AY + yl * c - z * s; out[2] = AZ + yl * s + z * c;
  return out;
}
function planar(q){
  const a23 = q[1] + q[2], a = a23 + q[3];
  const ex = -L1 * Math.sin(q[1]), ey = L1 * Math.cos(q[1]);
  const wx = ex - L2 * Math.sin(a23), wy = ey + L2 * Math.cos(a23);
  return { ex: ex, ey: ey, wx: wx, wy: wy, a: a, gx: wx - GC * Math.sin(a), gy: wy + GC * Math.cos(a), tx: wx - GRIP * Math.sin(a), ty: wy + GRIP * Math.cos(a) };
}
function graspOf(q, out){ const p = planar(q); return armToRobot(q[0], p.gx, p.gy, ARMP.ZF, out || [0, 0, 0]); }
const _hp = [0, 0, 0];
function inBox(p, b, r){ return p[0] > b.min[0] - r && p[0] < b.max[0] + r && p[1] > b.min[1] - r && p[1] < b.max[1] + r && p[2] > b.min[2] - r && p[2] < b.max[2] + r; }
// `extra` widens every clearance: plans use a margin, so the real motion never comes close
let PLAN_MARGIN = 0.012;
function armHits(q, carry, extra){
  const m = extra === undefined ? PLAN_MARGIN : extra;
  const P = planar(q), segs = [[0, 0, P.ex, P.ey, ARMP.ZU, 0.065, 0.35], [P.ex, P.ey, P.wx, P.wy, ARMP.ZF, 0.055, 0], [P.wx, P.wy, P.tx, P.ty, ARMP.ZF, 0.05, 0]];
  if (carry) segs.push([P.gx + carry * 0.5 * Math.sin(P.a), P.gy - carry * 0.5 * Math.cos(P.a), P.gx - carry * 0.5 * Math.sin(P.a), P.gy + carry * 0.5 * Math.cos(P.a), ARMP.ZF, 0.05, 0]);
  for (let k = 0; k < segs.length; k++){
    const g = segs[k];
    for (let i = 0; i <= 10; i++){
      const t = g[6] + (1 - g[6]) * i / 10;
      armToRobot(q[0], g[0] + (g[2] - g[0]) * t, g[1] + (g[3] - g[1]) * t, g[4], _hp);
      for (let j = 0; j < OBST.length; j++) if (inBox(_hp, OBST[j], OBST[j].n === "floor" ? 0 : g[5] + m)) return OBST[j].n;
    }
  }
  if (Math.hypot(P.tx - P.ex * 0.5, P.ty - P.ey * 0.5) < 0.12) return "self";
  return null;
}
function inLimits(q){ for (let i = 0; i < 5; i++){ if (q[i] < ARMP.LIM[i][0] || q[i] > ARMP.LIM[i][1]) return false; } return true; }
function planeThrough(X, Y, Z){
  const yr = Y - AY, zr = Z - AZ, yl = (yr >= 0 ? 1 : -1) * Math.sqrt(Math.max(yr * yr + zr * zr - PLANE * PLANE, 0));
  return { q1: Math.atan2(zr, yr) - Math.atan2(PLANE, yl), xl: X - AX, yl: yl };
}
function ik2(dx, dy, sign){
  const d = Math.hypot(dx, dy);
  if (d > L1 + L2 - 0.005 || d < Math.abs(L1 - L2) + 0.03) return null;
  const t2 = sign * Math.acos(Math.max(-1, Math.min(1, (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2))));
  return [Math.atan2(-dx, dy) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2)), t2];
}
// a valid pose with the grasp point at (X,Y,Z) and the gripper's in-plane angle near `a`: elbow up first, inside the limits, clear
function solveGrasp(X, Y, Z, a, roll, carry, span){
  const pl = planeThrough(X, Y, Z);
  for (let k = 0; k <= 72; k++){
    const da = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.05;
    if (Math.abs(da) > (span === undefined ? 1.2 : span)) break;
    const aa = a + da, wx = pl.xl + GC * Math.sin(aa), wy = pl.yl - GC * Math.cos(aa);
    const sols = [ik2(wx, wy, 1), ik2(wx, wy, -1)].filter(Boolean)
      .map(function(s){ return [wrapA(pl.q1), s[0], s[1], wrapA(aa - s[0] - s[1]), roll || 0]; })
      .sort(function(p, q){ return Math.cos(q[1]) - Math.cos(p[1]); });
    for (let i = 0; i < sols.length; i++) if (inLimits(sols[i]) && !armHits(sols[i], carry)) return sols[i];
  }
  return null;
}
function jdist(a, b){ let m = 0; for (let i = 0; i < 5; i++) m = Math.max(m, Math.abs(wrapA(b[i] - a[i])) * (i === 4 ? 0.5 : 1)); return m; }
function lerpQ(a, b, t){ return a.map(function(v, k){ return v + wrapA(b[k] - v) * t; }); }
function pathClear(a, b, carry){
  const n = Math.max(8, Math.ceil(jdist(a, b) / 0.03));
  for (let i = 1; i < n; i++){ const q = lerpQ(a, b, i / n); if (!inLimits(q) || armHits(q, carry)) return false; }
  return true;
}
function solveNear(X, Y, Z, a, roll, carry, prev){
  const pl = planeThrough(X, Y, Z);
  let best = null, bd = 1e9;
  for (let k = -12; k <= 12; k++){
    const aa = a + k * 0.05, wx = pl.xl + GC * Math.sin(aa), wy = pl.yl - GC * Math.cos(aa);
    [1, -1].forEach(function(sg){
      const s = ik2(wx, wy, sg); if (!s) return;
      const q = [wrapA(pl.q1), s[0], s[1], wrapA(aa - s[0] - s[1]), roll];
      if (!inLimits(q) || armHits(q, carry)) return;
      const d = jdist(prev, q) + Math.abs(k) * 0.002;
      if (d < bd){ bd = d; best = q; }
    });
  }
  return best;
}
// the grasp point travels a straight line; solved step by step, refusing any jump
function lineMove(q0, p0, p1, a, r0, r1, carry){
  const out = [q0];
  for (let i = 1; i <= 16; i++){
    const t = i / 16, prev = out[out.length - 1];
    const q = solveNear(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t, a, r0 + (r1 - r0) * t, carry, prev);
    if (!q || jdist(prev, q) > 0.35 || !pathClear(prev, q, carry)) return null;
    out.push(q);
  }
  return out;
}
const viaCache = {};
function viaPoses(carry){
  const key = carry.toFixed(3);
  if (viaCache[key]) return viaCache[key];
  const list = [];
  for (let x = -1.55; x <= -0.95; x += 0.3) for (let y = 0.95; y <= 2.05; y += 0.22) for (let z = AZ - 0.4; z <= AZ + 0.7; z += 0.275)
    [Math.PI, 1.8, 0.6].forEach(function(a){ const q = solveGrasp(x, y, z, a, 0, carry, 0.4); if (q) list.push(q); });
  return (viaCache[key] = list);
}
// a joint-space path from a to b: direct if clear, otherwise through one or two via poses, the shortest that works
function transfer(a, b, carry){
  if (pathClear(a, b, carry)) return [a, b];
  const vias = viaPoses(carry);
  let best = null, bd = 1e9;
  vias.forEach(function(v){
    if (!pathClear(a, v, carry) || !pathClear(v, b, carry)) return;
    const d = jdist(a, v) + jdist(v, b); if (d < bd){ bd = d; best = [a, v, b]; }
  });
  if (best) return best;
  const A1 = vias.filter(function(v){ return pathClear(a, v, carry); }), B1 = vias.filter(function(v){ return pathClear(v, b, carry); });
  A1.forEach(function(v){ B1.forEach(function(w){
    if (!pathClear(v, w, carry)) return;
    const d = jdist(a, v) + jdist(v, w) + jdist(w, b); if (d < bd){ bd = d; best = [a, v, w, b]; }
  }); });
  return best;
}
const READY = solveGrasp(-1.25, 1.65, AZ + 0.16, 0.9, 0, 0, 1.5) || [0, 1.79, -2.09, 1.2, 0];
const WAVE = solveGrasp(-1.05, 1.98, AZ + 0.1, 0.35, 0, 0, 1.0) || READY;

/* ---------- a trajectory player: a list of steps, each a polyline in joint space walked with minimum-jerk timing ---------- */
function minJerk(t){ return t * t * t * (10 - 15 * t + 6 * t * t); }
function pathStep(path, opts){
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + jdist(path[i - 1], path[i]));
  const len = cum[cum.length - 1];
  return Object.assign({ path: path, cum: cum, len: len, dur: Math.max(opts.min || 0.6, Math.min(3.4, len * (opts.pace || 0.9))) }, opts);
}
function holdStep(q, dur, opts){ return Object.assign({ path: [q], cum: [0], len: 0, dur: dur }, opts); }
function sampleStep(st, u, out){
  if (st.len === 0) { for (let k = 0; k < 5; k++) out[k] = st.path[0][k]; return out; }
  const s = minJerk(Math.min(1, Math.max(0, u))) * st.len;
  let i = 1; while (i < st.cum.length - 1 && st.cum[i] < s) i++;
  const seg = st.cum[i] - st.cum[i - 1], t = seg > 0 ? (s - st.cum[i - 1]) / seg : 1, a = st.path[i - 1], b = st.path[i];
  for (let k = 0; k < 5; k++) out[k] = a[k] + wrapA(b[k] - a[k]) * t;
  return out;
}
function buildScript(steps){ let t = 0; steps.forEach(function(s){ s.t0 = t; t += s.dur; }); return { steps: steps, total: t }; }

/* ---------- interaction ---------- */
const clock = new THREE.Clock();
const q = READY.slice(), qT = READY.slice(), qTmp = [0, 0, 0, 0, 0];
const state = {
  pointer: null, lastMove: -10, yaw: 0, prevYaw: 0, scrollYaw: 0, headYaw: 0, headPitch: 0, tilt: 0,
  grip: 0.3, nextBlink: 2, blinkT: -1,
  spin: 0, spinT: 0, spinV: 0, lastSpin: -10, lastUser: performance.now() / 1000, lastDemo: 0,
};
const clamp = THREE.MathUtils.clamp;
function damp(a, b, k, dt){ return a + (b - a) * (1 - Math.exp(-k * dt)); }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function now(){ return performance.now() / 1000; }
function setPointer(e){
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  state.pointer = ndc.clone();
  state.lastMove = now();
}
function hitsRobot(e){
  setPointer(e);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(robot, true).some(function(h){ return h.object !== blob; });
}
window.addEventListener("pointermove", function(e){ if (e.pointerType === "mouse" || e.pointerType === "pen") setPointer(e); }, { passive: true });
// drag turns the turntable; a short tap on the robot makes it wave
let drag = null;
canvas.addEventListener("pointerdown", function(e){
  drag = { x: e.clientX, spin0: state.spinT, last: e.clientX, t: now(), moved: false };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", function(e){
  if (drag){
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) drag.moved = true;
    if (drag.moved){
      state.spinT = drag.spin0 + dx * 0.012;
      const t = now(), dtp = Math.max(t - drag.t, 0.008);
      state.spinV = (e.clientX - drag.last) * 0.012 / dtp; drag.last = e.clientX; drag.t = t;
      state.lastSpin = t; state.lastUser = t;
    }
    return;
  }
  if (e.pointerType !== "mouse") return;
  ray.setFromCamera(ndc, camera);
  canvas.style.cursor = ray.intersectObject(robot, true).some(function(h){ return h.object !== blob; }) ? "pointer" : "grab";
}, { passive: true });
function endDrag(e, cancelled){
  if (!drag) return;
  if (!drag.moved && !cancelled && hitsRobot(e)) wave();
  if (!drag.moved) state.spinV = 0;
  drag = null; canvas.style.cursor = "grab";
}
canvas.addEventListener("pointerup", function(e){ endDrag(e, false); });
canvas.addEventListener("pointercancel", function(e){ endDrag(e, true); });
const waveBtn = document.getElementById("wave-btn"), demoBtn = document.getElementById("demo-btn");
if (waveBtn) waveBtn.addEventListener("click", wave);
if (demoBtn) demoBtn.addEventListener("click", function(){ state.lastUser = now(); startDemo(); });

let script = null;   // the running wave or sorting cycle
function wave(){
  state.lastUser = now();
  if (script) return;
  const there = transfer(q.slice(), WAVE, 0), back = transfer(WAVE, READY, 0);
  if (!there || !back) return;
  const steps = [pathStep(there, { pace: 0.6, min: 0.55, grip: 0.3 }), holdStep(WAVE, 1.5, { wiggle: true, grip: 0.45 }), pathStep(back, { pace: 0.7, grip: 0.3 })];
  script = Object.assign(buildScript(steps), { kind: "wave", t0: clock.getElapsedTime() });
}

/* ---------- the sorting cycle: the states of the robot's ROS 2 task manager, played on a planned trajectory ---------- */
const hud = document.createElement("div");
hud.className = "robot-hud"; hud.setAttribute("aria-hidden", "true");
hud.innerHTML = '<span class="hud-state"></span><div class="hud-box"><span class="hud-label"></span></div>' +
  '<div class="hud-joints">' + ["J1 BASE", "J2 SHOULDER", "J3 ELBOW", "J4 WRIST", "J5 ROLL", "GRIP"].map(function(n){
    return '<div class="hj"><span class="hj-n">' + n + '</span><span class="hj-bar"><i></i></span><span class="hj-v"></span></div>';
  }).join("") + "</div>";
stage.appendChild(hud);
const hudState = hud.querySelector(".hud-state"), hudBox = hud.querySelector(".hud-box"), hudLabel = hud.querySelector(".hud-label");
const hudRows = Array.prototype.slice.call(hud.querySelectorAll(".hj")).map(function(r){ return { bar: r.querySelector("i"), v: r.querySelector(".hj-v") }; });
const ITEM = { x: -0.62, z: 1.0 };
const ITEM_SPOTS = [[-0.62, 1.0], [-0.7, 1.0], [-0.66, 1.06], [-0.74, 0.96], [-0.58, 1.08]];
let demo = null, demoCount = 0;
// try the usual spot in front of the robot first, then a few close by
function planCycle(cls, q0){
  for (let i = 0; i < ITEM_SPOTS.length; i++){
    const p = planAt(cls, q0, ITEM_SPOTS[i][0], ITEM_SPOTS[i][1]);
    if (p){ p.spot = ITEM_SPOTS[i]; return p; }
  }
  return null;
}
function planAt(cls, q0, ix, iz){
  const h = cls.h, bin = BINS[cls.bin], P = [ix, h / 2, iz];
  const ap = solveGrasp(P[0], P[1] + 0.24, P[2], Math.PI, 0, 0, 0.9); if (!ap) return null;
  const dn = lineMove(ap, [P[0], P[1] + 0.24, P[2]], P, Math.PI, 0, 0, 0); if (!dn) return null;
  const pk = dn[dn.length - 1];
  const up = lineMove(pk, P, [P[0], P[1] + 0.42, P[2]], Math.PI, 0, 0.8, h); if (!up) return null;
  const lf = up[up.length - 1];
  const B0 = [bin.x, LID + 0.22 + h / 2, bin.z], B1 = [bin.x, LID + 0.07 + h / 2, bin.z];
  const ab = solveGrasp(B0[0], B0[1], B0[2], Math.PI, 0, h, 1.8); if (!ab) return null;
  const aDrop = ab[1] + ab[2] + ab[3];
  const dr = lineMove(ab, B0, B1, aDrop, 0, 0, h); if (!dr) return null;
  const rel = dr[dr.length - 1];
  const bk = lineMove(rel, B1, B0, aDrop, 0, 0, 0); if (!bk) return null;
  const t1 = transfer(q0, ap, 0), t2 = transfer(lf, ab, h), t3 = transfer(bk[bk.length - 1], READY, 0);
  if (!t1 || !t2 || !t3) return null;
  const S = [
    holdStep(q0, 1.4, { name: "SEARCHING", scan: true, grip: 0.3, spawn: true }),
    holdStep(q0, 0.9, { name: "DETECTED", box: true, grip: 0.3 }),
    holdStep(q0, 0.7, { name: "REPOSITIONING", box: true, grip: 0.3, reposition: true }),
    holdStep(q0, 0.4, { name: "STOPPED", box: true, grip: 0.3 }),
    pathStep(t1, { name: "GRASPING", box: true, grip: 0.62, cam: "pick" }),
    pathStep(dn, { name: "GRASPING", box: true, grip: 0.62, min: 0.9, cam: "pick" }),
    holdStep(pk, 0.5, { name: "GRASPING", box: true, grip: cls.grip, attach: true, cam: "pick" }),
  ];
  if (cls.id === "metal") S.push(holdStep(pk, 1.0, { name: "VERIFYING_METAL", box: true, grip: cls.grip, sensor: true, cam: "pick" }));
  S.push(
    pathStep(up, { name: "SORTING", grip: cls.grip, min: 0.9, cam: "pick" }),
    pathStep(t2, { name: "SORTING", grip: cls.grip, cam: "bins", pace: 1.0 }),
    pathStep(dr, { name: "SORTING", grip: cls.grip, min: 0.7, cam: "bins" }),
    holdStep(rel, 0.45, { name: "SORTING", grip: 0.62, release: true, cam: "bins" }),
    pathStep(bk, { name: "SORTING", grip: 0.4, min: 0.5, cam: "bins" }),
    pathStep(t3, { name: "RETURNING", grip: 0.3, flash: true })
  );
  return buildScript(S);
}
// plans are made from READY in idle time after load, then reused; a cycle starts by easing from wherever the arm is
const planCache = {};
function getPlan(cls){ if (!(cls.id in planCache)) planCache[cls.id] = planCycle(cls, READY.slice()); return planCache[cls.id]; }
const idle = window.requestIdleCallback || function(f){ return setTimeout(f, 60); };
setTimeout(function warm(i){ if (i < CLASSES.length) idle(function(){ getPlan(CLASSES[i]); setTimeout(function(){ warm(i + 1); }, 300); }); }.bind(null, 0), 1800);
function startDemo(){
  if (demo || (script && script.kind === "wave")) return;
  const cls = CLASSES[demoCount++ % CLASSES.length];
  const cached = getPlan(cls);
  if (!cached) return;
  const lead = transfer(q.slice(), READY, 0) || [q.slice(), READY];
  const steps = cached.steps.slice();
  steps[0] = Object.assign(pathStep(lead, { name: "SEARCHING", scan: true, grip: 0.3, spawn: true }), { dur: 1.4 });
  const plan = Object.assign(buildScript(steps), { spot: cached.spot });
  const g = new THREE.Group(); cls.make(g);
  g.traverse(function(o){ if (o.isMesh && noShadow.indexOf(o.material) < 0) o.castShadow = true; });
  g.position.set(plan.spot[0], 0, plan.spot[1]); g.scale.setScalar(0.001); robot.add(g);
  demo = { cls: cls, item: g, held: false, dropped: false, vy: 0 };
  script = Object.assign(plan, { kind: "demo", t0: clock.getElapsedTime() });
  const ar = document.documentElement.getAttribute("data-lang") === "ar";
  hudLabel.textContent = ar ? cls.ar + " ← حاوية " + (cls.bin + 1) : cls.en + " → BIN " + (cls.bin + 1);
  stage.classList.add("demo");
  hud.classList.add("on");
}
function endDemo(){
  setLock(null);
  if (demo.item.parent) demo.item.parent.remove(demo.item);
  demo = null; stage.classList.remove("demo"); hud.classList.remove("on"); hudBox.classList.remove("on");
  M.sensorCap.emissiveIntensity = 0;
}
const v3 = new THREE.Vector3(), bb = new THREE.Box3();
function placeBox(obj){
  bb.setFromObject(obj);
  if (bb.isEmpty()) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < 8; i++){
    v3.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).project(camera);
    const sx = (v3.x * 0.5 + 0.5) * w, sy = (-v3.y * 0.5 + 0.5) * h;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  hudBox.style.left = (x0 - 8).toFixed(1) + "px"; hudBox.style.top = (y0 - 8).toFixed(1) + "px";
  hudBox.style.width = (x1 - x0 + 16).toFixed(1) + "px"; hudBox.style.height = (y1 - y0 + 16).toFixed(1) + "px";
}
let hudTick = 0;
function updateJointHud(){
  const deg = function(r){ return Math.round(r * 180 / Math.PI); };
  for (let i = 0; i < 5; i++){
    const L = ARMP.LIM[i], f = (q[i] - L[0]) / (L[1] - L[0]);
    hudRows[i].bar.style.width = (clamp(f, 0, 1) * 100).toFixed(0) + "%";
    hudRows[i].v.textContent = (deg(q[i]) > 0 ? "+" : "") + deg(q[i]) + "°";
  }
  const g = clamp(state.grip / 0.62, 0, 1);
  hudRows[5].bar.style.width = (g * 100).toFixed(0) + "%";
  hudRows[5].v.textContent = Math.round(g * 100) + "%";
}

/* ---------- framing: a camera rig that eases toward the action during the cycle ---------- */
const VIEWS = {
  home: { look: [-0.22, 0.82, 0], dir: [-0.34, 0.27, 1], r: 1.5 },
  pick: { look: [-0.42, 0.62, 0.42], dir: [-0.3, 0.36, 1], r: 1.32 },
  bins: { look: [-0.25, 1.05, -0.05], dir: [-0.42, 0.62, 1], r: 1.48 },
};
const rig = { look: new THREE.Vector3(-0.22, 0.82, 0), dir: new THREE.Vector3(-0.34, 0.27, 1).normalize(), r: 1.5, view: "home" };
const tmpDir = new THREE.Vector3(), tmpLook = new THREE.Vector3();
function placeCamera(){
  const narrow = camera.aspect < 1.25, r = rig.r * (narrow ? 1.08 : 1);
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
  const dist = Math.max(r / Math.sin(vf), r / Math.sin(hf)) * 0.98;
  tmpLook.copy(rig.look); if (narrow) tmpLook.x -= 0.08;
  camera.position.copy(tmpLook).addScaledVector(rig.dir, dist);
  camera.lookAt(tmpLook);
}
function resize(){
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  placeCamera();
  measureCallouts();
}
new ResizeObserver(resize).observe(stage);

/* ---------- callouts ---------- */
const svg = document.getElementById("leaders");
const NS = "http://www.w3.org/2000/svg";
const callouts = Array.prototype.slice.call(stage.querySelectorAll(".callout")).map(function(el){
  const line = document.createElementNS(NS, "line"), dot = document.createElementNS(NS, "circle");
  dot.setAttribute("r", "3.5"); svg.appendChild(line); svg.appendChild(dot);
  return { el: el, a: anchors[el.dataset.anchor], line: line, dot: dot, box: null };
});
function measureCallouts(){
  const s = stage.getBoundingClientRect();
  callouts.forEach(function(c){ const r = c.el.getBoundingClientRect(); c.box = { l: r.left - s.left, r: r.right - s.left, y: r.top - s.top + r.height / 2 }; });
}
window.addEventListener("wa-layout", function(){ requestAnimationFrame(measureCallouts); });
function drawCallouts(){
  if (!callouts.length || callouts[0].el.offsetParent === null || demo) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  callouts.forEach(function(c){
    if (!c.box || !c.a) return;
    c.a.getWorldPosition(v3).project(camera);
    const sx = (v3.x * 0.5 + 0.5) * w, sy = (-v3.y * 0.5 + 0.5) * h;
    const x1 = sx > (c.box.l + c.box.r) / 2 ? c.box.r : c.box.l;
    c.line.setAttribute("x1", x1.toFixed(1)); c.line.setAttribute("y1", c.box.y.toFixed(1));
    c.line.setAttribute("x2", sx.toFixed(1)); c.line.setAttribute("y2", sy.toFixed(1));
    c.dot.setAttribute("cx", sx.toFixed(1)); c.dot.setAttribute("cy", sy.toFixed(1));
  });
}

/* ---------- point at a label, and the part it names is targeted in 3D ---------- */
const TARGETS = {
  elbow: [base], gripper: [roll], panel: [pi, uno], track: tracks.map(function(t){ return t.group; }),
  camera: [cam], bins: BINS.map(function(b){ return b.group; }),
};
const lockMat = new THREE.LineBasicMaterial({ color: 0x3ddcff, transparent: true, opacity: 0.95, depthTest: false });
const locks = [];
let locked = null;
function setLock(key){
  locks.forEach(function(h){ scene.remove(h); }); locks.length = 0; locked = key;
  (TARGETS[key] || []).forEach(function(o){ const h = new THREE.Box3Helper(new THREE.Box3(), 0x3ddcff); h.material = lockMat; h.renderOrder = 10; h.userData.obj = o; scene.add(h); locks.push(h); });
}
function updateLocks(t){
  locks.forEach(function(h){ h.box.setFromObject(h.userData.obj); h.box.expandByScalar(0.02 + Math.sin(t * 6) * 0.008); });
  lockMat.opacity = 0.65 + Math.sin(t * 6) * 0.3;
}
callouts.forEach(function(c){
  const key = c.el.dataset.anchor;
  c.el.addEventListener("pointerenter", function(){ setLock(key); });
  c.el.addEventListener("pointerleave", function(){ if (locked === key) setLock(null); });
  c.el.addEventListener("click", function(){ setLock(locked === key ? null : key); });
});

/* ---------- loop ---------- */
let visible = true;
new IntersectionObserver(function(es){ visible = es[0].isIntersecting; if (visible) clock.getDelta(); }, { threshold: 0 }).observe(stage);
const gp = [0, 0, 0], headW = new THREE.Vector3(), itemW = new THREE.Vector3();

function frame(){
  requestAnimationFrame(frame);
  if (!visible || document.hidden) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime(), tn = now();
  const idle = !state.pointer || tn - state.lastMove > 4;

  // the cycle runs on its own when nobody has touched the robot for a while
  if (!script && !reduce && !drag && tn - Math.max(state.lastUser, state.lastMove) > 7 && tn - state.lastDemo > 16){ state.lastDemo = tn; startDemo(); }

  // turntable: drag with a little inertia, then it drifts back to face the page
  if (!drag){
    state.spinT += state.spinV * dt; state.spinV *= Math.exp(-3.2 * dt);
    if (tn - state.lastSpin > 6 || demo) state.spinT = damp(state.spinT, Math.round(state.spinT / (Math.PI * 2)) * Math.PI * 2, demo ? 2.5 : 1.2, dt);
  }
  state.spin = damp(state.spin, state.spinT, 10, dt);
  turntable.rotation.y = state.spin;
  const sr = stage.getBoundingClientRect();
  state.scrollYaw = -0.55 * clamp(-sr.top / Math.max(sr.height, 1), 0, 1);

  let px = 0, py = 0;
  if (!idle){ px = state.pointer.x; py = state.pointer.y; }
  else if (!reduce){ px = Math.sin(t * 0.35) * 0.3 - 0.22; py = Math.sin(t * 0.5) * 0.2; }

  // the arm: a running script owns it; otherwise it holds READY and leans toward the pointer, never into anything
  let st = null, gripT = 0.3, yawT = clamp(px * 0.32, -0.35, 0.35) + state.scrollYaw, look = null;
  if (script){
    const u = t - script.t0;
    if (u >= script.total){
      if (script.kind === "demo"){ endDemo(); state.lastDemo = tn; }
      for (let k = 0; k < 5; k++) q[k] = script.steps[script.steps.length - 1].path.slice(-1)[0][k];
      script = null;
    } else {
      let i = 0; while (i < script.steps.length - 1 && u >= script.steps[i].t0 + script.steps[i].dur) i++;
      st = script.steps[i];
      const su = (u - st.t0) / st.dur;
      sampleStep(st, su, q);
      if (st.wiggle){ q[3] = WAVE[3] + Math.sin(u * 9) * 0.32; q[4] = WAVE[4] + Math.sin(u * 9) * 0.6; }
      gripT = st.grip;
      if (script.kind === "demo"){
        const d = demo;
        hudState.textContent = st.name;
        if (st.spawn) d.item.scale.setScalar(Math.min(1, Math.max(0.001, (su * st.dur - 0.3) / 0.5)));
        if (st.reposition) yawT = Math.sin(su * Math.PI) * 0.1;
        else yawT = 0;
        if (st.attach && su > 0.6 && !d.held){ d.held = true; roll.attach(d.item); }
        M.sensorCap.emissiveIntensity = st.sensor ? 0.6 + Math.sin(u * 18) * 0.5 : 0;
        if (st.release && su > 0.4 && !d.dropped){ d.dropped = true; robot.attach(d.item); d.vy = 0; }
        if (st.flash) M.binBand.emissive.setHex(0x000000);
        hudBox.classList.toggle("on", !!st.box && d.item.scale.x > 0.5);
        if (st.box) placeBox(d.item);
        // the head follows the item, then the gripper
        if (st.scan) look = { yaw: Math.sin(su * 6) * 0.6, pitch: -0.25 };
        else { d.item.getWorldPosition(itemW); robot.worldToLocal(itemW); look = itemW; }
        rig.view = st.cam || "home";
      }
    }
  }
  if (!st){
    // READY plus bounded offsets toward the pointer; shrink them until the pose is clear
    let k = 1;
    for (let tries = 0; tries < 4; tries++){
      qTmp[0] = READY[0] + py * 0.14 * k; qTmp[1] = READY[1] + px * 0.18 * k; qTmp[2] = READY[2] - py * 0.22 * k;
      qTmp[3] = READY[3] + py * 0.3 * k; qTmp[4] = READY[4] + px * 0.8 * k;
      if (inLimits(qTmp) && !armHits(qTmp, 0)) break;
      k *= 0.5; if (tries === 3) for (let j = 0; j < 5; j++) qTmp[j] = READY[j];
    }
    for (let j = 0; j < 5; j++) q[j] = damp(q[j], qTmp[j], 5, dt);
    gripT = reduce ? 0.3 : 0.3 + Math.sin(t * 1.4) * 0.1;
    rig.view = "home";
  }
  base.rotation.x = q[0]; shoulder.rotation.z = q[1]; elbow.rotation.z = q[2]; wrist.rotation.z = q[3]; roll.rotation.y = q[4];
  state.grip = damp(state.grip, gripT, 12, dt);
  fingers.forEach(function(f){ f.g.rotation.z = -f.s * state.grip; f.jaw.rotation.z = f.s * state.grip; });
  if (demo && demo.dropped){
    const bin = BINS[demo.cls.bin], it = demo.item;
    demo.vy -= 5.5 * dt; it.position.y = Math.max(bin.floor, it.position.y + demo.vy * dt);
    it.position.x = damp(it.position.x, bin.x, 10, dt); it.position.z = damp(it.position.z, bin.z - 0.005, 10, dt);
    it.quaternion.slerp(qtn.identity(), 1 - Math.exp(-8 * dt));
  }
  if (demo && (t - script.t0) > 0.5 && hud.classList.contains("on") && ++hudTick % 3 === 0) updateJointHud();

  // body turns toward the pointer; tracks counter-rotate like a skid-steer turn
  state.yaw = damp(state.yaw, yawT, 4, dt);
  robot.rotation.y = state.yaw;
  const dYaw = state.yaw - state.prevYaw; state.prevYaw = state.yaw;
  tracks[0].s -= dYaw * TRACK_X * 1.6;
  tracks[1].s += dYaw * TRACK_X * 1.6;
  layoutTracks();

  // the head: toward the pointer, or toward what the cycle is working on
  let hy = clamp(px * 0.9, -0.9, 0.9) - state.yaw * 0.3, hp = clamp(py * 0.4, -0.35, 0.45);
  if (look && look.isVector3){
    headW.set(0, LID + 0.3, 0.06);
    const dx = look.x - headW.x, dy = look.y - headW.y, dz = look.z - headW.z;
    hy = clamp(Math.atan2(dx, Math.max(dz, 0.15)), -1.1, 1.1); hp = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.7, 0.55);
  } else if (look){ hy = look.yaw; hp = look.pitch; }
  if (script && script.kind === "wave"){ hp = 0.3; hy = -0.3; }
  state.headYaw = damp(state.headYaw, hy, 6, dt);
  state.headPitch = damp(state.headPitch, hp, 6, dt);
  head.rotation.y = state.headYaw;
  neckTop.rotation.x = -state.headPitch;
  state.tilt = damp(state.tilt, script && script.kind === "wave" ? 0.12 : demo && st && st.box ? -0.06 : -py * 0.06, 5, dt);
  eyes.forEach(function(e){ e.rotation.z = state.tilt * e.scale.x; });

  // blink
  if (!reduce && t > state.nextBlink){ state.blinkT = t; state.nextBlink = t + 2.2 + Math.random() * 3; }
  const bp = (t - state.blinkT) / 0.16;
  const open = bp >= 0 && bp < 1 ? 1 - Math.sin(bp * Math.PI) * 0.92 : 1;
  pupils.forEach(function(l){ l.scale.y = open; });
  blades.rotation.x += dt * (reduce ? 0 : 14);

  // camera rig eases toward the current view
  const V = VIEWS[reduce ? "home" : rig.view], kc = 1 - Math.exp(-1.6 * dt);
  rig.look.lerp(tmpLook.set(V.look[0], V.look[1], V.look[2]), kc);
  rig.dir.lerp(tmpDir.set(V.dir[0], V.dir[1], V.dir[2]).normalize(), kc).normalize();
  rig.r += (V.r - rig.r) * kc;
  placeCamera();

  if (locks.length) updateLocks(t);
  renderer.render(scene, camera);
  drawCallouts();
}

// for inspection from the console: the planner and the arm's state
stage._robot = { planCycle: planCycle, CLASSES: CLASSES, READY: READY, WAVE: WAVE, armHits: armHits, inLimits: inLimits, sampleStep: sampleStep, q: q, transfer: transfer };
resize();
layoutTracks();
renderer.compile(scene, camera);
canvas.style.cursor = "grab";
requestAnimationFrame(function(){ stage.classList.add("ready"); document.getElementById("stage-col").classList.add("ready"); measureCallouts(); });
frame();
