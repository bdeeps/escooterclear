// EScooterClear's shared models: a generic seated electric scooter and a generic kick scooter (no
// brand shapes), a battery made of cells, a BLDC hub motor, and the physics every chapter shares.
// 1 scene unit = 25 cm for the scooters.
import { THREE, M, rod, beam, box, tube, spring, swarm, clamp } from './kit.js';

export const TAU = Math.PI * 2;
export const G = 9.81;            // m/s²
export const RHO = 1.2;           // air, kg/m³ (sea level, about 20 °C)
export const KMH = 3.6;
export const U = 4;               // scene units per metre

// ---------------------------------------------------------------- cells
// Typical datasheet values (makers' ranges): NMC cells are 3.6–3.7 V nominal, 4.2 V full and
// cut off at about 2.5–3.0 V; a 21700 holds about 4.8–5 Ah and weighs about 70 g, an 18650 about
// 2.5–3.5 Ah and 45–48 g. LFP cells are 3.2 V nominal and 3.65 V full; a 32700 holds about 6 Ah,
// about 145 g. The open-circuit voltage curves are smoothed typical shapes, not one cell's data.
export const CELLS = {
  nmc21700: { name: '21700 NMC', vNom: 3.6, vMax: 4.2, vMin: 3.0, ah: 5.0, g: 70, d: 0.021, h: 0.070, r: 0.025,
    ocv: [[0, 3.0], [0.05, 3.33], [0.1, 3.45], [0.2, 3.55], [0.3, 3.61], [0.4, 3.66], [0.5, 3.72], [0.6, 3.79], [0.7, 3.88], [0.8, 3.97], [0.9, 4.07], [1, 4.19]] },
  nmc18650: { name: '18650 NMC', vNom: 3.6, vMax: 4.2, vMin: 3.0, ah: 2.9, g: 47, d: 0.018, h: 0.065, r: 0.035,
    ocv: [[0, 3.0], [0.05, 3.33], [0.1, 3.45], [0.2, 3.55], [0.3, 3.61], [0.4, 3.66], [0.5, 3.72], [0.6, 3.79], [0.7, 3.88], [0.8, 3.97], [0.9, 4.07], [1, 4.19]] },
  lfp32700: { name: '32700 LFP', vNom: 3.2, vMax: 3.65, vMin: 2.5, ah: 6.0, g: 145, d: 0.032, h: 0.070, r: 0.012,
    ocv: [[0, 2.5], [0.05, 3.0], [0.1, 3.18], [0.2, 3.24], [0.4, 3.27], [0.6, 3.29], [0.8, 3.31], [0.9, 3.33], [0.97, 3.4], [1, 3.6]] },
};
export function interp(table, x) {
  if (x <= table[0][0]) return table[0][1];
  const n = table.length; if (x >= table[n - 1][0]) return table[n - 1][1];
  let i = 1; while (table[i][0] < x) i++;
  const [x0, y0] = table[i - 1], [x1, y1] = table[i];
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}
export const ocv = (cell, soc) => interp(cell.ocv, clamp(soc, 0, 1));
// A pack of nS groups in series, each of nP cells in parallel.
export function pack(cell, nS, nP) {
  const V = nS * cell.vNom, Ah = nP * cell.ah, kWh = (V * Ah) / 1000;
  return { cell, nS, nP, n: nS * nP, V, Vmax: nS * cell.vMax, Vmin: nS * cell.vMin, Ah, kWh, kg: (nS * nP * cell.g) / 1000, R: (nS * cell.r) / nP };
}
// The example scooter: 16 groups in series × 10 cells in parallel of 21700 NMC: 57.6 V, 50 Ah,
// 2.88 kWh (typical of Indian family e-scooters, which quote about 2.5–4 kWh). Makers keep some
// charge in reserve; 90% usable here (illustrative).
export const PACK = pack(CELLS.nmc21700, 16, 10);
export const USABLE = 0.9;

// ---------------------------------------------------------------- the vehicle
// 100 kg scooter + 70 kg rider (the series brief's example). Tyres 90/90-12: radius 0.1524 + 0.081 m.
// Rolling resistance 0.015 and CdA 0.6 m², the same figures MotorcycleClear uses for an upright
// commuter and its rider (Cossalter, Motorcycle Dynamics: Cd·A 0.4–0.7 m²; bike tyres Crr 0.015–0.02).
export const VEH = { kg: 100, rider: 70, crr: 0.015, cda: 0.6, R: 0.233 };
export function roadLoad(kmh, slopePct = 0, mass = VEH.kg + VEH.rider) {
  const v = kmh / KMH, th = Math.atan(slopePct / 100);
  const roll = VEH.crr * mass * G * Math.cos(th), drag = 0.5 * RHO * VEH.cda * v * v, climb = mass * G * Math.sin(th);
  return { v, mass, roll, drag, climb, F: roll + drag + climb, P: (roll + drag + climb) * v };
}

// ---------------------------------------------------------------- the hub motor
// A direct-drive BLDC (PMSM) hub motor, modelled as its DC equivalent: back-EMF = Ke·ω, torque = Kt·I
// (Ke = Kt in SI units), winding resistance R. Iron and friction losses grow with speed (1.6 W per
// rad/s). The controller limits phase current to 160 A (torque) and battery current to 60 A (power),
// and can apply at most 95% of the battery voltage. Constants are illustrative, chosen so a 57.6 V
// pack gives about 112 N·m at the wheel from standstill, about 3.5 kW peak and a top speed in the
// low 60s km/h, typical of Indian family e-scooters (3–4 kW peak hub motors).
export const MOTOR = { Ke: 0.7, R: 0.03, Imax: 160, IbMax: 60, fe: 1.6, mod: 0.95, ctrl: 0.97, poles: 14, slots: 12 };
export const AUX = 25;            // W: display, lights (via the DC-DC converter), controller logic
// The most torque the motor can give at wheel speed ω (rad/s) with pack voltage Vb.
export function maxTorque(w, Vb = PACK.V) {
  const e = MOTOR.Ke * w, Vm = MOTOR.mod * Vb;
  const Iv = (Vm - e) / MOTOR.R;                                     // what the voltage can push
  // Battery power limit: I·(e + I·R) = Vb·IbMax·ηctrl, solved for I.
  const Pb = Vb * MOTOR.IbMax * MOTOR.ctrl, Ip = (-e + Math.sqrt(e * e + 4 * MOTOR.R * Pb)) / (2 * MOTOR.R);
  const I = Math.max(0, Math.min(MOTOR.Imax, Iv, Ip));
  return { I, T: MOTOR.Ke * I - (MOTOR.fe * w > 0 ? MOTOR.fe : 0), lim: I === MOTOR.Imax ? 'current' : I === Ip ? 'power' : 'voltage' };
}
// No-load top speed (km/h) set by the voltage: back-EMF equals what the controller can apply.
export const voltSpeed = (Vb = PACK.V) => ((MOTOR.mod * Vb) / MOTOR.Ke) * VEH.R * KMH;
// Electrical side for a given wheel torque T (N·m) at ω.
export function motorPower(T, w, Vb = PACK.V) {
  const loss0 = MOTOR.fe * w;                                         // iron + friction
  const I = Math.max(0, (T * 1 + (w > 0.01 ? loss0 / w : 0)) / MOTOR.Ke);
  const e = MOTOR.Ke * w, cu = I * I * MOTOR.R, Pmech = T * w;
  const Pin = I * e + cu;                                             // into the motor
  const Pbat = Pin / MOTOR.ctrl;
  return { I, e, Vm: e + I * MOTOR.R, cu, iron: loss0, Pmech, Pin, Pbat, Ib: Pbat / Vb, eta: Pin > 0 ? Pmech / Pin : 0 };
}

// Steady riding: everything from the wheel back to the socket.
// Charger 90% (typical on-board/off-board chargers 88–93%); battery losses from its resistance.
export const CHARGER_ETA = 0.9;
export function ride(kmh, slopePct = 0, mass = VEH.kg + VEH.rider, P = PACK) {
  const L = roadLoad(kmh, slopePct, mass), w = L.v / VEH.R;
  const T = L.F * VEH.R;
  const m = motorPower(T, w, P.V);
  const Pout = m.Pbat + AUX;                                          // from the battery terminals
  const Ib = Pout / P.V, batLoss = Ib * Ib * P.R;
  const Pchem = Pout + batLoss;                                       // energy taken out of the cells
  // Put back in by the charger: cells' charge loss is about the same as on discharge (a typical
  // round trip of about 95%), then the charger's own loss.
  const Pplug = (Pchem * (1 + batLoss / Math.max(1, Pout))) / CHARGER_ETA;
  const km = kmh > 0.5 ? kmh : 0.5;
  const whkm = (p) => p / km;                                         // W ÷ (km/h) = Wh per km
  const usable = P.kWh * 1000 * USABLE;
  return { ...L, w, T, m, Pout, batLoss, Pchem, Pplug, wheel: whkm(L.P), bat: whkm(Pchem), plug: whkm(Pplug), range: L.P > 0 ? usable / whkm(Pchem) : Infinity, ok: maxTorque(w, P.V).T >= T };
}

// ---------------------------------------------------------------- a petrol scooter, for comparison
// A generic 110 cc scooter with a belt CVT. Engine model as in MotorcycleClear: friction mean
// effective pressure (1.0 + 0.1 × rpm/1000) bar, indicated efficiency 0.30; a belt CVT passes on
// about 80% (typical 75–85%); the CVT holds about 3,000 + 55 × km/h rpm. 106 kg + 70 kg rider.
export const PETROL = { lhv: 43e6, rho: 0.745, kwhPerL: 8.9 };
export function petrolRide(kmh, slopePct = 0, extra = 0) {
  const L = roadLoad(kmh, slopePct, 106 + 70 + extra);
  const brake = L.P / 0.8, rpm = 3000 + 55 * kmh, disp = 110e-6;
  const fric = (1.0 + 0.1 * (rpm / 1000)) * 1e5 * disp * (rpm / 120);
  const fuelW = (brake + fric) / 0.3;
  const lph = ((fuelW / PETROL.lhv) * 3600) / PETROL.rho;
  return { ...L, brake, fric, fuelW, kmpl: kmh / Math.max(1e-6, lph), whkm: fuelW / Math.max(0.5, kmh), eta: L.P / fuelW };
}

// ---------------------------------------------------------------- regenerative braking
// The rear hub motor works as a generator. Limits (illustrative): 0.12 g (only the rear wheel, and
// the rear tyre carries less load while braking), 2.5 kW, fading out below 8 km/h where the motor
// makes too little voltage. Of the energy it takes, about 80% reaches the cells (motor about 88%,
// controller 97%, battery 95%): the same 0.8 BrakeClear uses for an electric car.
export const REGEN = { aMax: 0.12 * G, Pmax: 2500, vFade: 8 / KMH, eff: 0.8 };
export function regenStop(kmh, aAsk, on = true, mass = VEH.kg + VEH.rider) {
  let v = kmh / KMH, eB = 0, eF = 0, eR = 0, x = 0, t = 0; const dt = 0.005;
  while (v > 0) {
    const roll = VEH.crr * G, drag = (0.5 * RHO * VEH.cda * v * v) / mass;
    const aBrake = Math.max(0, aAsk - roll - drag);
    const fade = clamp(v / REGEN.vFade, 0, 1);
    const aM = on ? Math.min(REGEN.aMax, v > 0.1 ? REGEN.Pmax / (mass * v) : REGEN.aMax) * fade : 0;
    const aR = Math.min(aBrake, aM), aF = aBrake - aR;
    eB += mass * aR * v * dt * REGEN.eff; eF += mass * aF * v * dt; eR += mass * (roll + drag) * v * dt;
    x += v * dt; v -= aAsk * dt; t += dt;
  }
  return { eB, eF, eR, x, t, total: 0.5 * mass * (kmh / KMH) ** 2 };
}

// ---------------------------------------------------------------- charging (CC-CV)
// Constant current until the pack reaches 4.2 V a cell, then constant voltage while the current
// tapers; stop at C/20. The resistance here is a lumped "effective" one (0.2 Ω a cell, including
// the slow chemical polarisation), so the taper starts at about 80–85%. Illustrative, typical shape.
export function chargeSim(P, kwDC, soc0) {
  const cell = P.cell, Rp = (P.nS * 0.2) / P.nP, Vcv = P.Vmax, Icc = (kwDC * 1000) / Vcv, Icut = (P.nP * cell.ah) / 20;
  const pts = []; let soc = soc0, t = 0, I = Icc, cvAt = null; const dt = 20;    // seconds
  while (t < 14 * 3600) {
    const E = ocv(cell, soc) * P.nS;
    I = Math.min(Icc, (Vcv - E) / Rp);
    if (I < Icc && cvAt === null) cvAt = { t, soc };
    if (I <= Icut || soc >= 0.999) { pts.push({ t, soc, I: 0, V: E }); break; }
    pts.push({ t, soc, I, V: E + I * Rp });
    soc += (I * dt) / 3600 / (P.nP * cell.ah); t += dt;
  }
  const end = pts[pts.length - 1];
  const at = (k) => (pts.find((p) => p.soc >= k) || end).t;
  return { pts, Icc, cvAt, end, at, wallA: (kwDC * 1000) / CHARGER_ETA / 230 };
}

// ---------------------------------------------------------------- formats
export const fmt0 = (v) => Math.round(v).toLocaleString('en-IN');
export const fmt1 = (v) => (Math.abs(v) >= 100 ? fmt0(v) : v.toFixed(1));
export const hm = (s) => { const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
export const COL = {
  text: '#e8eef8', muted: 'rgba(255,255,255,.62)', A: '#ff6b6b', B: '#ffd166', C: '#5ab8ff', N: '#ff5a5a', S: '#4c7dff',
  energy: '#5ce1a9', heat: '#ff7a3d', drag: '#8ef0ff', roll: '#ffb547', climb: '#c49bff', petrol: '#ff9a3d', plug: '#7aa2ff', good: '#5ce1a9', bad: '#ff6b6b',
};
export const hex = (c) => new THREE.Color(c).getHex();

// ---------------------------------------------------------------- layout helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowScreen = () => window.innerWidth < 560 && !inReel();
// Picks a view for 'wide' (desktop, 16:9 video), 'narrow' (phone) or 'tall' (upright video).
export function framer(stage, pick) {
  let last = null;
  return (key = '') => {
    const mode = stage.host.clientWidth < 560 && !inReel() ? 'narrow' : stage.camera.aspect < 0.9 ? 'tall' : 'wide';
    const id = mode + '|' + key;
    if (id === last) return mode;
    const first = last === null; last = id;
    const v = pick(mode, key);
    if (v && (!stage.moved || !first)) stage.setView(v.pos, v.target, first ? 0.4 : 0.9);
    return mode;
  };
}
// On a phone: hide minor labels and slide the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y = -0.12) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = l.visible && !narrow; });
  const sy = narrow ? y : 0;
  if (!stage.shift || stage.shift[1] !== sy) stage.setShift(0, sy);
  return narrow;
}
export function rows(head, list, note = '', keep = 3, width = 300) {
  const nar = narrowScreen();
  return `<div style="max-width:${width}px"><div class="big">${head}</div>` + (nar ? list.slice(0, keep) : list).map(([a, b, col]) => `<div class="row"><span>${a}</span><b${col ? ` style="color:${col}"` : ''}>${b}</b></div>`).join('') + (note && !nar ? `<small>${note}</small>` : '') + '</div>';
}

// ---------------------------------------------------------------- boards (live charts in 3D)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,.92)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.stroke(); }
export function board(root, w, h, pxW, pxH, draw, pos, rotY = 0) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
  mesh.position.set(...pos); mesh.rotation.y = rotY; mesh.renderOrder = 10; root.add(mesh);
  return { mesh, redraw, put(p, s = 1, r = rotY) { mesh.position.set(...p); mesh.scale.setScalar(s); mesh.rotation.y = r; } };
}
export function title(g, t, sub = '', size = 30) {
  g.textAlign = 'left'; g.fillStyle = COL.text; g.font = `bold ${size}px sans-serif`; g.fillText(t, 26, size + 14);
  if (sub) { g.font = `${Math.round(size * 0.66)}px sans-serif`; g.fillStyle = COL.muted; g.fillText(sub, 26, size * 2 + 12); }
}
export function axes(g, w, h, { x0 = 96, x1 = w - 34, y0 = h - 74, y1 = 100, xMin = 0, xMax, yMin = 0, yMax, xTicks = [], yTicks = [], xFmt = String, yFmt = String, xLabel = '', yLabel = '', font = 22 }) {
  const X = (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0), Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `${font}px sans-serif`; g.textAlign = 'left';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + font + 8); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + font / 3); }
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.8)';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + font * 2 + 12);
  if (yLabel) g.fillText(yLabel, x0 + 10, y1 - 14);
  return { X, Y, x0, x1, y0, y1 };
}
export function line(g, pts, X, Y, col, wdt = 5, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function dot(g, x, y, col, r = 11) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
export function text(g, s, x, y, col = COL.text, font = '22px sans-serif', align = 'left') { g.fillStyle = col; g.font = font; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
export function hbar(g, x0, x1, y, hgt, k, col, label, value, font = 22, lx = 26) {
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x0, y, x1 - x0, hgt);
  g.fillStyle = col; g.fillRect(x0, y, Math.max(3, (x1 - x0) * clamp(k, 0, 1)), hgt);
  g.fillStyle = 'rgba(255,255,255,.8)'; g.font = `${font}px sans-serif`; g.textAlign = 'left'; g.fillText(label, lx, y + hgt * 0.5 + font * 0.36);
  g.fillStyle = '#fff'; g.font = `bold ${font}px sans-serif`;
  const kk = clamp(k, 0, 1), tw = g.measureText(value).width, tx = x0 + (x1 - x0) * kk + 10;
  g.fillText(value, tx + tw > x1 ? Math.max(x0 + 6, x0 + (x1 - x0) * kk - tw - 10) : tx, y + hgt * 0.5 + font * 0.36);
}

// ---------------------------------------------------------------- 3D pieces
export const DS = THREE.DoubleSide;
export function vrod(y0, y1, r0, r1 = r0, mat, seg = 24) { const m = rod(y0, y1, r0, r1, mat, seg); m.position.set(0, m.position.x, 0); m.rotation.z = Math.PI / 2; return m; }
export function zrod(z0, z1, r0, r1 = r0, mat, seg = 32) { const m = rod(z0, z1, r0, r1, mat, seg); m.position.set(0, 0, m.position.x); m.rotation.y = -Math.PI / 2; return m; }
export function at(o, x, y, z) { o.position.set(x, y, z); return o; }
// Lathe about the Z axis from [z, r] pairs (a wheel's axle runs along z).
export function latheZ(profile, mat, seg = 56) {
  const g = new THREE.LatheGeometry(profile.map(([z, r]) => new THREE.Vector2(Math.max(0, r), z)), seg);
  g.rotateX(Math.PI / 2); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
// A rounded box, rounded in the XY outline, extruded along Z and centred.
export function rbox(w, h, d, r, mat) {
  const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  s.moveTo(-x, -h / 2); s.lineTo(x, -h / 2); s.absarc(x, -y, r, -Math.PI / 2, 0); s.lineTo(w / 2, y); s.absarc(x, y, r, 0, Math.PI / 2);
  s.lineTo(-x, h / 2); s.absarc(-x, y, r, Math.PI / 2, Math.PI); s.lineTo(-w / 2, -y); s.absarc(-x, -y, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: Math.min(r, d) * 0.3, bevelThickness: Math.min(r, d) * 0.3, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
// An extruded side profile (points in XY), d thick, centred on z.
export function slab(pts, d, mat, bevel = 0.05) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 12 });
  g.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}

// A wheel: tyre + rim, spinning about z. R tyre radius, rim radius, width.
export function makeWheel({ R, rim, width, hub = 0, disc = 0, hubMat, tread = true }) {
  const group = new THREE.Group(), spin = new THREE.Group(); group.add(spin);
  const w = width / 2;
  const tyre = latheZ([[-w * 0.75, rim], [-w, rim + (R - rim) * 0.35], [-w * 0.9, R - (R - rim) * 0.2], [-w * 0.5, R], [w * 0.5, R], [w * 0.9, R - (R - rim) * 0.2], [w, rim + (R - rim) * 0.35], [w * 0.75, rim]], M.matte(0x1b1d22, { roughness: 0.92, side: DS }));
  spin.add(tyre);
  if (tread) {
    const tr = swarm(36, new THREE.BoxGeometry(0.05 * R, 0.035 * R, width * 0.7), M.matte(0x2c2f36));
    for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU; tr.place(i, [Math.cos(a) * R, Math.sin(a) * R, 0], [0, 0, a]); }
    tr.done(); spin.add(tr);
  }
  const rimM = latheZ([[-w * 0.8, rim * 0.9], [-w * 0.8, rim * 1.02], [w * 0.8, rim * 1.02], [w * 0.8, rim * 0.9]], M.metal(0xb8bfca, { roughness: 0.3, side: DS }));
  spin.add(rimM);
  const out = { group, spin, tyre, rim: rimM };
  if (hub) {
    // A hub motor fills most of the rim: a drum (the rotor with its magnets) on a fixed axle.
    out.drum = latheZ([[-w * 0.7, 0.12 * R], [-w * 0.7, hub], [w * 0.7, hub], [w * 0.7, 0.12 * R]], hubMat || M.metal(0x4b525e, { roughness: 0.45, side: DS }));
    spin.add(out.drum);
    for (let i = 0; i < 10; i++) { const fin = box(hub * 0.08, (rim - hub) * 0.9, width * 0.5, M.metal(0x8d939e)); const a = (i / 10) * TAU; fin.position.set(Math.cos(a) * (hub + rim) / 2, Math.sin(a) * (hub + rim) / 2, 0); fin.rotation.z = a; spin.add(fin); }
  } else {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; spin.add(beam([Math.cos(a) * 0.12 * R, Math.sin(a) * 0.12 * R, 0], [Math.cos(a + 0.3) * rim, Math.sin(a + 0.3) * rim, 0], 0.035 * R, M.metal(0xb8bfca))); }
  }
  if (disc) { const d = latheZ([[0, disc * 0.45], [0, disc], [0.02, disc], [0.02, disc * 0.45]], M.metal(0xc9ced6, { roughness: 0.35, side: DS })); d.position.z = width * 0.62; spin.add(d); out.disc = d; }
  spin.add(zrod(-w * 0.9, w * 0.9, 0.09 * R, 0.09 * R, M.metal(0x8d939e)));
  return out;
}

// ---------------------------------------------------------------- the seated e-scooter
// Generic and unbranded: a step-through frame with a flat floor, the pack under the floor, a rear
// hub motor on a single-sided swingarm, a telescopic fork. Units of 25 cm; x forward, y up, +z is
// the rider's right. Axles 1.30 m apart.
export const SC = { R: VEH.R * U, rim: 0.1524 * U, width: 0.09 * U, rearX: -2.6, frontX: 2.6 };
export function makeScooter({ body = 0xb9c6d2 } = {}) {
  const group = new THREE.Group();
  const R = SC.R, ay = R;
  const bodyMat = M.plastic(body, { roughness: 0.35, transparent: true, opacity: 1 });
  const darkMat = M.plastic(0x2a2e36, { roughness: 0.6 });
  const frameMat = M.metal(0x59606c, { roughness: 0.45 });
  const parts = {};

  // Frame: a steel tube from the steering head down, along under the floor, and up under the seat.
  const frame = new THREE.Group(); group.add(frame); parts.frame = frame;
  for (const z of [-0.32, 0.32]) frame.add(tube([[2.05, 3.05, 0], [1.85, 2.2, z * 0.6], [1.55, 0.95, z], [-0.7, 0.92, z], [-1.4, 1.5, z], [-2.5, 2.55, z * 0.8]], 0.075, frameMat, false, 80));
  frame.add(beam([2.05, 3.05, 0], [2.25, 3.65, 0], 0.13, frameMat));       // steering head
  for (let i = 0; i < 3; i++) frame.add(beam([-0.6 + i * 0.85, 0.92, -0.32], [-0.6 + i * 0.85, 0.92, 0.32], 0.05, frameMat));

  // Battery pack under the floor: an enclosure, 16 × 10 upright cells, a BMS board on top.
  const packG = new THREE.Group(); packG.position.set(0.35, 0.75, 0); group.add(packG); parts.pack = packG;
  const encMat = M.clear(0x9fb4c8, 0.22, { roughness: 0.3 });
  const enc = rbox(1.95, 0.42, 1.05, 0.06, encMat); packG.add(enc); parts.enclosure = enc;
  const cd = PACK.cell.d * U, ch = PACK.cell.h * U;
  const cells = swarm(160, new THREE.CylinderGeometry(cd / 2 * 0.95, cd / 2 * 0.95, ch, 12), M.plastic(0x2f6fb0, { roughness: 0.4 }));
  for (let i = 0; i < 16; i++) for (let j = 0; j < 10; j++) cells.place(i * 10 + j, [(i - 7.5) * cd * 1.05, -0.04, (j - 4.5) * cd * 1.05]);
  cells.done(); packG.add(cells); parts.cells = cells;
  const bms = new THREE.Group(); bms.position.set(0, 0.2, 0); packG.add(bms); parts.bms = bms;
  bms.add(box(0.9, 0.03, 0.5, M.plastic(0x1f6f4a)));
  for (let i = 0; i < 5; i++) bms.add(at(box(0.1, 0.04, 0.08, M.plastic(0x15171c)), -0.3 + i * 0.15, 0.03, 0.1));
  bms.add(at(box(0.16, 0.06, 0.12, M.plastic(0xd9d9d9)), 0.3, 0.04, -0.15));
  const plug = at(box(0.14, 0.14, 0.2, M.plastic(0xe0a030)), 1.05, 0.05, 0); packG.add(plug);

  // Floor board and body panels.
  const panels = new THREE.Group(); group.add(panels); parts.panels = panels;
  const floor = at(box(2.3, 0.08, 1.25, darkMat), 0.4, 1.12, 0); panels.add(floor);
  const apron = slab([[1.35, 1.1], [1.75, 1.1], [2.35, 2.2], [2.55, 3.3], [2.45, 3.75], [2.05, 3.8], [1.95, 3.3], [1.55, 2.2], [1.35, 1.6]], 1.25, bodyMat, 0.08);
  panels.add(apron);
  const rearBody = slab([[-0.5, 1.15], [-0.25, 1.15], [-0.35, 2.6], [-2.9, 2.9], [-3.35, 2.55], [-3.0, 2.05], [-2.0, 1.75], [-0.9, 1.3]], 1.15, bodyMat, 0.1);
  panels.add(rearBody);
  const fender = slab([[2.0, 1.6], [2.45, 2.1], [3.3, 1.6], [3.55, 1.2], [3.3, 1.35], [2.6, 1.85]], 0.36, bodyMat, 0.04); panels.add(fender);
  parts.bodyMat = bodyMat;

  // Seat (lifts for the storage space).
  const seat = rbox(2.6, 0.32, 1.0, 0.14, M.matte(0x22252b, { roughness: 0.8 })); seat.position.set(-1.6, 3.0, 0); seat.rotation.z = -0.04; group.add(seat); parts.seat = seat;

  // Front: telescopic fork, steering column, handlebar with grips, throttle, levers, display, light.
  const front = new THREE.Group(); group.add(front); parts.front = front;
  const rake = 0.42;                                        // about 24° from vertical
  for (const z of [-0.36, 0.36]) {
    front.add(beam([SC.frontX, ay, z], [SC.frontX - 1.25 * Math.sin(rake), ay + 1.25 * Math.cos(rake), z], 0.085, M.metal(0xd8dde6, { roughness: 0.2 })));
    front.add(beam([SC.frontX - 1.15 * Math.sin(rake), ay + 1.15 * Math.cos(rake), z], [SC.frontX - 2.5 * Math.sin(rake), ay + 2.5 * Math.cos(rake), z], 0.12, M.metal(0x6c7484)));
  }
  const top = [SC.frontX - 3.1 * Math.sin(rake), ay + 3.1 * Math.cos(rake)];
  front.add(beam([SC.frontX - 2.4 * Math.sin(rake), ay + 2.4 * Math.cos(rake), 0], [top[0], top[1], 0], 0.09, frameMat));
  const bar = new THREE.Group(); bar.position.set(top[0] - 0.1, top[1] + 0.05, 0); front.add(bar); parts.bar = bar;
  bar.add(zrod(-1.25, 1.25, 0.06, 0.06, M.metal(0xc0c6cf)));
  bar.add(at(zrod(-1.25, -0.8, 0.1, 0.1, M.matte(0x1d1f24)), 0, 0, 0));
  const throttle = zrod(0.8, 1.25, 0.11, 0.11, M.matte(0x30343c)); bar.add(throttle); parts.throttle = throttle;
  const throttleMark = at(box(0.05, 0.04, 0.4, M.glow(0xffb547)), 0.11, 0, 1.02); bar.add(throttleMark); parts.throttleMark = throttleMark;
  const levers = [];
  for (const sgn of [-1, 1]) {
    const lev = new THREE.Group(); lev.position.set(0.05, 0.05, sgn * 0.7); bar.add(lev);
    lev.add(at(box(0.18, 0.14, 0.16, M.plastic(0x2a2e36)), 0, 0, 0));
    lev.add(beam([0.08, 0, 0], [0.25, -0.02, sgn * 0.5], 0.03, M.metal(0xb8bfca)));
    lev.add(at(box(0.07, 0.07, 0.06, M.glow(0x8ef0ff)), -0.06, 0.09, sgn * 0.02));   // the cut-off switch
    levers.push(lev);
  }
  parts.levers = levers;
  const dispTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, g: c.getContext('2d'), t }; })();
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.38), new THREE.MeshBasicMaterial({ map: dispTex.t, toneMapped: false }));
  display.position.set(-0.12, 0.32, 0); display.rotation.set(0, -Math.PI / 2, 0); display.rotateX(-0.55); bar.add(display);
  const dispBack = at(box(0.1, 0.42, 0.8, darkMat), -0.06, 0.3, 0); dispBack.rotation.z = -0.55; bar.add(dispBack);
  parts.display = display;
  parts.setDisplay = (kmh, soc, msg = '') => {
    const { g, c, t } = dispTex; g.fillStyle = '#081016'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#8ef0ff'; g.font = 'bold 62px sans-serif'; g.textAlign = 'left'; g.fillText(String(Math.round(kmh)), 16, 74);
    g.font = '20px sans-serif'; g.fillText('km/h', 16, 104);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(150, 30, 90, 26); g.fillStyle = soc > 0.2 ? '#5ce1a9' : '#ff6b6b'; g.fillRect(150, 30, 90 * clamp(soc, 0, 1), 26);
    g.fillStyle = '#e8eef8'; g.font = '20px sans-serif'; g.fillText(Math.round(soc * 100) + '%', 172, 84);
    if (msg) { g.fillStyle = '#ffb547'; g.font = 'bold 18px sans-serif'; g.fillText(msg, 150, 112); }
    t.needsUpdate = true;
  };
  parts.setDisplay(0, 0.8);
  const lamp = at(rbox(0.25, 0.3, 0.5, 0.08, M.glow(0xfff4d6)), 2.55, 3.35, 0); lamp.rotation.z = -0.4; front.add(lamp); parts.lamp = lamp;
  const tail = at(box(0.1, 0.18, 0.6, M.glow(0xff3b3b)), -3.3, 2.6, 0); group.add(tail); parts.tail = tail;

  // DC-DC converter (pack voltage down to 12 V for lights and horn), behind the apron.
  const dcdc = at(rbox(0.36, 0.28, 0.3, 0.05, M.metal(0x9aa3b2, { roughness: 0.4 })), 1.75, 2.3, -0.2); group.add(dcdc); parts.dcdc = dcdc;

  // Rear: single-sided swingarm on the left (−z), hub motor in the wheel, controller, shock.
  const rear = new THREE.Group(); group.add(rear);
  const arm = new THREE.Group(); rear.add(arm); parts.arm = arm;
  arm.add(beam([-0.85, 1.05, -0.45], [SC.rearX, ay, -0.45], 0.11, M.metal(0x7c8594)));
  arm.add(at(zrod(-0.55, 0.0, 0.09, 0.09, M.metal(0x8d939e)), -0.85, 1.05, 0));
  const shock = new THREE.Group(); rear.add(shock); parts.shock = shock;
  shock.add(beam([SC.rearX + 0.35, ay + 0.15, -0.5], [-2.25, 2.45, -0.5], 0.06, M.metal(0xd8dde6)));
  const sp = spring(0, 1.0, 0.13, 0.025, 7, M.metal(0xe0503a, { roughness: 0.4 }));
  sp.position.set(SC.rearX + 0.42, ay + 0.35, -0.5); sp.rotation.z = Math.atan2(2.45 - ay - 0.15, -2.25 - SC.rearX - 0.35); shock.add(sp);
  const ctrl = new THREE.Group(); ctrl.position.set(-1.25, 1.55, 0.25); group.add(ctrl); parts.controller = ctrl;
  ctrl.add(rbox(0.6, 0.32, 0.4, 0.05, M.metal(0x9aa3b2, { roughness: 0.35 })));
  for (let k = 0; k < 6; k++) ctrl.add(at(box(0.55, 0.05, 0.02, M.metal(0x7c8594)), 0, 0.18, -0.17 + k * 0.068));
  // Three thick phase wires from the controller to the hub motor (yellow, green, blue).
  const phase = new THREE.Group(); group.add(phase); parts.phase = phase;
  [0xffd166, 0x5ce1a9, 0x5ab8ff].forEach((c, i) => phase.add(tube([[-1.4, 1.42, 0.12 + i * 0.07], [-1.9, 1.25, -0.35], [SC.rearX + 0.2, ay + 0.05, -0.55 + i * 0.05]], 0.03, M.plastic(c), false, 24)));

  const wF = makeWheel({ R, rim: SC.rim, width: SC.width, disc: SC.rim * 0.85 }); wF.group.position.set(SC.frontX, ay, 0); group.add(wF.group);
  const wR = makeWheel({ R, rim: SC.rim, width: SC.width, hub: SC.rim * 0.88 }); wR.group.position.set(SC.rearX, ay, 0); group.add(wR.group);
  // Front disc caliper and rear drum brake shoe housing (a cover on the hub's side).
  const caliper = at(box(0.3, 0.22, 0.14, M.metal(0xd04a3a)), SC.frontX - 0.35, ay + 0.35, SC.width * 0.75); group.add(caliper);
  parts.wheels = { front: wF, rear: wR };
  parts.motor = wR;

  // Off-board charger on the ground with its cable, and the charging socket on the body.
  const chg = new THREE.Group(); chg.position.set(-0.2, 0.18, 2.4); group.add(chg); parts.charger = chg;
  chg.add(rbox(0.8, 0.32, 0.5, 0.07, M.plastic(0x30343c)));
  for (let k = 0; k < 5; k++) chg.add(at(box(0.7, 0.03, 0.02, M.plastic(0x4a4f59)), 0, 0.17, -0.18 + k * 0.09));
  chg.add(tube([[0.3, 0.1, -0.25], [0.6, 0.4, -1.0], [0.1, 1.6, -1.6], [-0.35, 2.15, -1.95]], 0.035, M.plastic(0x1a1c20), false, 30));
  const port = at(box(0.16, 0.16, 0.06, M.plastic(0x1a1c20)), -0.55, 2.3, 0.6); group.add(port); parts.port = port;

  return { group, parts, bodyMat, setSpin(a) { wF.spin.rotation.z = a; wR.spin.rotation.z = a; } };
}

// ---------------------------------------------------------------- the kick scooter
// Generic: a deck holding a 10-series battery (36 V), a front hub motor, folding stem, 10-inch wheels.
export function makeKick() {
  const group = new THREE.Group(), parts = {};
  const R = 0.127 * U, frontX = 2.3, rearX = -2.1;
  const deckMat = M.plastic(0x3a3f4a, { transparent: true, opacity: 1, roughness: 0.5 });
  const deck = rbox(3.9, 0.22, 0.75, 0.1, deckMat); deck.position.set(0.05, 0.62, 0); group.add(deck); parts.deck = deck; parts.deckMat = deckMat;
  const bat = new THREE.Group(); bat.position.set(0.05, 0.62, 0); group.add(bat); parts.pack = bat;
  const cd = 0.018 * U;
  const cells = swarm(30, new THREE.CylinderGeometry(cd / 2 * 0.95, cd / 2 * 0.95, 0.065 * U, 10), M.plastic(0x2f6fb0));
  for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) { cells.place(i * 3 + j, [(i - 4.5) * cd * 1.05 - 0.3, 0, (j - 1) * cd * 1.05], [Math.PI / 2, 0, 0]); }
  cells.done(); bat.add(cells);
  bat.add(at(box(0.35, 0.03, 0.4, M.plastic(0x1f6f4a)), 0.9, 0.05, 0));
  const stemTopY = 4.4;
  const stem = new THREE.Group(); group.add(stem); parts.stem = stem;
  stem.add(beam([frontX, R, 0], [frontX - 0.35, 1.1, 0], 0.08, M.metal(0x6c7484)));
  stem.add(beam([frontX - 0.35, 1.1, 0], [frontX - 0.85, stemTopY, 0], 0.09, M.metal(0x9aa3b2)));
  stem.add(at(box(0.3, 0.25, 0.3, M.metal(0x5d636e)), frontX - 0.4, 1.15, 0));      // folding latch
  stem.add(at(zrod(-1.0, 1.0, 0.055, 0.055, M.metal(0xc0c6cf)), frontX - 0.85, stemTopY, 0));
  stem.add(at(zrod(0.7, 1.0, 0.09, 0.09, M.matte(0x1d1f24)), frontX - 0.85, stemTopY, 0));
  stem.add(at(zrod(-1.0, -0.7, 0.09, 0.09, M.matte(0x1d1f24)), frontX - 0.85, stemTopY, 0));
  stem.add(at(box(0.25, 0.08, 0.35, M.plastic(0x101418)), frontX - 0.85, stemTopY + 0.1, 0));
  stem.add(at(box(0.15, 0.1, 0.2, M.glow(0xfff4d6)), frontX - 0.55, 2.2, 0));
  const ctrl = at(rbox(0.5, 0.16, 0.45, 0.04, M.metal(0x9aa3b2)), 1.6, 0.62, 0); group.add(ctrl); parts.controller = ctrl;
  const wF = makeWheel({ R, rim: R * 0.55, width: 0.06 * U, hub: R * 0.5 }); wF.group.position.set(frontX, R, 0); group.add(wF.group);
  const wR = makeWheel({ R, rim: R * 0.55, width: 0.06 * U, disc: R * 0.45 }); wR.group.position.set(rearX, R, 0); group.add(wR.group);
  group.add(at(box(0.9, 0.06, 0.4, M.plastic(0x2a2e36)), rearX - 0.05, R * 2 + 0.08, 0));   // rear mudguard
  parts.wheels = { front: wF, rear: wR };
  return { group, parts, setSpin(a) { wF.spin.rotation.z = a; wR.spin.rotation.z = a; } };
}

// A simple rider (seated), made of capsules, for scale.
export function makeRider(color = 0x5b6b8a) {
  const g = new THREE.Group(), m = M.matte(color, { roughness: 0.8 }), skin = M.matte(0xc68b62);
  const cap = (a, b, r, mat = m) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const geo = new THREE.CapsuleGeometry(r, A.distanceTo(B), 6, 12); const o = new THREE.Mesh(geo, mat); o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); o.castShadow = true; return o; };
  for (const z of [-0.33, 0.33]) {
    g.add(cap([-1.4, 3.35, z], [0.4, 2.7, z], 0.24));             // thigh
    g.add(cap([0.4, 2.7, z], [0.75, 1.35, z], 0.2));              // shin
    g.add(at(box(0.6, 0.18, 0.28, M.matte(0x22252b)), 0.95, 1.25, z));
    g.add(cap([-1.05, 5.4, z * 1.2], [0.2, 4.6, z * 2.6], 0.14));  // upper arm
    g.add(cap([0.2, 4.6, z * 2.6], [1.0, 4.5, z * 3.2], 0.12));    // forearm
  }
  g.add(cap([-1.5, 3.5, 0], [-1.0, 5.5, 0], 0.5));                 // torso
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), M.plastic(0xe9edf2, { roughness: 0.3 })), -0.85, 6.35, 0));   // helmet
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), skin), -0.75, 6.15, 0));
  return g;
}

// Where a point at screen position (fx, fy) in -1…1 lands, on the plane through the view's target
// facing the camera, once the stage has settled on that view (stage.setView backs off on narrow
// stages by the same factor). Places mesh there, facing the camera, hFrac of the screen's
// half-height tall (baseH: the mesh's own height). Returns the point.
export function screenPlace(stage, view, fx, fy, mesh = null, hFrac = 0, baseH = 1, face = true) {
  const k = Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, stage.camera.aspect)));
  const t = new THREE.Vector3(...view.target), p = new THREE.Vector3(...view.pos).sub(t).multiplyScalar(k).add(t);
  const cam = new THREE.PerspectiveCamera(stage.camera.fov, stage.camera.aspect, 0.05, 3000);
  cam.position.copy(p); cam.lookAt(t); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const D = p.distanceTo(t), fwd = t.clone().sub(p).normalize();
  const dir = new THREE.Vector3(fx, fy, 0.5).unproject(cam).sub(p).normalize();
  const pt = p.clone().add(dir.multiplyScalar(D / dir.dot(fwd)));
  if (mesh) {
    mesh.position.copy(pt);
    if (face) mesh.quaternion.copy(cam.quaternion);
    if (hFrac) mesh.scale.setScalar((hFrac * D * Math.tan((stage.camera.fov * Math.PI) / 360)) / baseH);
  }
  return pt;
}
export const stageMode = (stage) => (stage.host.clientWidth < 560 && !inReel() ? 'narrow' : stage.camera.aspect < 0.9 ? 'tall' : 'wide');
