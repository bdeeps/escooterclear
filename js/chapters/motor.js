// Chapter 3: the hub motor. An outer-rotor BLDC with 12 stator teeth and 14 magnets (a common
// 12-slot/14-pole layout; real scooter hub motors often have more of both). Each tooth belongs to a
// phase by its electrical angle (7 pole pairs × its position): A, B or C, wound one way or the other.
// Six-step commutation: three hall sensors read the magnets and the controller picks one of six
// switch states, so the stator's field is always about 90 electrical degrees ahead of the rotor's.
// Motor numbers (Ke, R, current limits) and the scooter's road load come from scooter.js:
// torque = Ke × current, back-EMF = Ke × ω, the controller can't push current once back-EMF nears
// the battery voltage, so the top speed rises with pack voltage.
import { THREE, M, box, torus, approach, clamp } from '../kit.js';
import { MOTOR, VEH, KMH, G, maxTorque, voltSpeed, motorPower, roadLoad, CELLS, pack, board, panelBg, title, axes, line, dot, text, framer, fitNarrow, rows, screenPlace, fmt0, fmt1, COL, TAU } from '../scooter.js';

const PP = MOTOR.poles / 2, NT = MOTOR.slots;          // 7 pole pairs, 12 teeth
const SLOW = 1 / 20;                                    // the motor turns 20× slower on screen
const PACKS = { 48: pack(CELLS.nmc21700, 13, 10), 60: pack(CELLS.nmc21700, 16, 10), 72: pack(CELLS.nmc21700, 20, 10) };
const MASS = VEH.kg + VEH.rider;
const STEPS = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]];   // A, B, C in each of six steps
const PH = ['A', 'B', 'C'], PCOL = [COL.A, COL.B, COL.C];
const VIEWS = { wide: { pos: [0, 9.9, 16], target: [0, 8.5, 0] }, narrow: { pos: [0, 9.9, 16], target: [0, 8.5, 0] }, tall: { pos: [0, 9.9, 16], target: [0, 8.5, 0] } };
// Where the motor and the chart sit on screen (x, y in −1…1; chart height as a share of half the screen).
const SPOTS = { wide: { rig: [0.42, 0.08], chart: [-0.52, -0.46, 0.62] }, narrow: { rig: [0.45, 0.08], chart: [0, -0.6, 0.42], k: 0.9 }, tall: { rig: [0, 0.3], chart: [0, -0.42, 0.5], k: 1.25 } };

export default {
  id: 'motor',
  short: 'The hub motor',
  title: 'The motor inside the wheel',
  subtitle: 'Magnets on the wheel, coils on the axle, and electronics that switch them in turn.',
  view: VIEWS.wide,
  learn: `<p>Open a hub motor and you find two rings. The outer ring is part of the wheel and turns with it: a steel drum lined with <b>permanent magnets</b>, north and south in turn. The inner ring is bolted to the axle and never moves: the <b>stator</b>, iron teeth wound with copper <b>coils</b>.</p>
    <p>The coils are wired into three sets, called <b>phases</b> A, B and C. Push current through a coil and its tooth becomes a magnet. Get the timing right and the teeth always pull the magnets just ahead and push the ones just behind, so the wheel turns. That is a <b>brushless DC motor (BLDC)</b>.</p>
    <p>Who does the timing? Three tiny <b>hall sensors</b> feel which magnet is passing. The <b>controller</b> reads them and flips its switches (transistors called MOSFETs) to one of <b>six steps</b>, over and over. InductionClear shows the same kind of switching.</p>
    <p>Two simple rules run the whole scooter. <b>Torque comes from current</b>: twist the throttle and the controller lets more current flow, so the push is stronger. <b>Speed is limited by voltage</b>: a spinning motor is also a generator, making a <b>back-EMF</b> that rises with speed. When it nearly matches the battery voltage, no more current can be pushed in. FaradayClear explains that generator effect.</p>
    <p>That is why an electric scooter pulls hard <b>from a standstill</b>. Current, and so torque, is available at zero speed, with no clutch and no gears.</p>
    <p class="tip"><b>Try it:</b> open the throttle and watch the coils light up in turn. Then switch the battery from 48 V to 72 V and see the top speed move.</p>`,
  terms: [
    { t: 'Stator', d: 'The still part of a motor: iron teeth wrapped in copper coils. In a hub motor it is fixed to the axle.' },
    { t: 'Rotor', d: 'The turning part. In a hub motor it is the wheel’s drum with magnets inside.' },
    { t: 'Phase', d: 'One of the three sets of coils, A, B and C, each fed by the controller in turn.' },
    { t: 'Hall sensor', d: 'A tiny chip that senses a magnetic field, so the controller knows where the magnets are.' },
    { t: 'Back-EMF', d: 'The voltage a spinning motor makes, like a generator. It grows with speed and opposes the battery.' },
    { t: 'Torque', d: 'Turning force. In this motor it is the motor constant × current.' },
  ],
  defaults: { throttle: 60, volts: 60, slope: 0, labels: true },
  controls: [
    { key: 'throttle', type: 'range', label: 'Throttle', min: 0, max: 100, step: 1, fmt: (v) => Math.round(v) + '%' },
    { key: 'volts', type: 'seg', label: 'Battery', options: [{ v: 48, label: '48 V class (13S)' }, { v: 60, label: '60 V class (16S)' }, { v: 72, label: '72 V class (20S)' }], fmt: (v) => PACKS[v].V.toFixed(1) + ' V nominal' },
    { key: 'slope', type: 'range', label: 'Road slope', min: 0, max: 15, step: 0.5, fmt: (v) => v + '%' },
    { key: 'go', type: 'buttons', label: 'Scooter', items: [{ label: 'Stop and start again', act: (s, inst) => inst.stop() }] },
  ],
  quiz: [
    { q: 'In a hub motor, which part carries the magnets?', options: ['The axle', 'The turning drum of the wheel', 'The battery', 'The brake disc'], answer: 1, why: 'The magnets line the inside of the wheel’s drum, which spins around the fixed stator.' },
    { q: 'Why can an electric scooter pull hard from a standstill?', options: ['It has a clever gearbox', 'Torque comes from current, and full current is available at zero speed', 'The battery is heavier when full', 'The tyres are wider'], answer: 1, why: 'Torque = motor constant × current. The controller can send full current even before the wheel turns.' },
    { q: 'What mostly sets the motor’s top speed?', options: ['The tyre colour', 'The battery voltage, against the back-EMF that grows with speed', 'The number of brake levers', 'How full the tyres are'], answer: 1, why: 'Back-EMF rises with speed. When it nears the battery voltage, no more current can flow in. Higher voltage, higher top speed.' },
  ],
  reel: [
    { ms: 5600, caption: 'Magnets ride on the wheel; coils sit on the axle. The controller lights the three phases in turn to pull the wheel round.', set: { volts: 60, slope: 0 }, act: (s, inst) => inst.stop(), anim: { throttle: [20, 70] }, spin: 0 },
    { ms: 5200, caption: 'Current gives torque, even at standstill. Voltage sets the top speed, where back-EMF catches up.', set: { volts: 72, slope: 0, throttle: 100 }, act: (s, inst) => inst.stop(18), spin: 0.12 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rig = new THREE.Group(); root.add(rig);
    const MX = 0, MY = 2.2;
    const motor = new THREE.Group(); motor.position.set(MX, MY, 0); rig.add(motor);
    const RO = 3.05, RI = 2.62, RM = 2.42, RT = 2.2;     // drum outer/inner, magnet face, tooth tip
    // Rotor: drum + 14 magnets + tyre rim hint.
    const rotor = new THREE.Group(); motor.add(rotor);
    const ring = (r0, r1, mat, z = 0.9) => { const s = new THREE.Shape(); s.absarc(0, 0, r1, 0, TAU, false); const h = new THREE.Path(); h.absarc(0, 0, r0, 0, TAU, true); s.holes.push(h); const g = new THREE.ExtrudeGeometry(s, { depth: z, bevelEnabled: false, curveSegments: 96 }); g.translate(0, 0, -z / 2); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
    rotor.add(ring(RI, RO, M.metal(0x59606c, { roughness: 0.45 })));
    rotor.add(ring(RO, RO + 0.55, M.matte(0x1b1d22, { roughness: 0.9 }), 1.2));       // tyre, cut short
    const magMats = [];
    for (let j = 0; j < MOTOR.poles; j++) {
      const a = (j / MOTOR.poles) * TAU, w = (TAU / MOTOR.poles) * 0.82;
      const s = new THREE.Shape(); s.absarc(0, 0, RI, a - w / 2, a + w / 2, false); s.absarc(0, 0, RM, a + w / 2, a - w / 2, true);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false, curveSegments: 12 }); g.translate(0, 0, -0.4);
      const mat = M.plastic(j % 2 === 0 ? 0xe04848 : 0x3f6fe0, { roughness: 0.35 });
      rotor.add(new THREE.Mesh(g, mat)); magMats.push(mat);
    }
    const mark = box(0.5, 0.14, 0.05, M.glow(0xffffff)); mark.position.set(0, RO + 0.3, 0.62); rotor.add(mark);
    // Stator: core + 12 teeth with coils.
    const stator = new THREE.Group(); motor.add(stator);
    stator.add(ring(0.55, 1.25, M.metal(0x7c8594, { roughness: 0.5 })));
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 3.2, 24), M.metal(0xc9ced6)); axle.rotation.x = Math.PI / 2; stator.add(axle);
    const teeth = [];
    for (let t = 0; t < NT; t++) {
      const phi = (t / NT) * TAU, holder = new THREE.Group(); holder.rotation.z = phi; stator.add(holder);
      const iron = M.metal(0x8b919c, { roughness: 0.5, emissive: new THREE.Color(0), emissiveIntensity: 1 });
      const stem = box(RT - 1.25 - 0.15, 0.36, 0.72, iron); stem.position.x = 1.25 + (RT - 1.25 - 0.15) / 2; holder.add(stem);
      const tip = box(0.16, 0.95, 0.72, iron); tip.position.x = RT - 0.08; holder.add(tip);
      // Which phase and which way: by the tooth's electrical angle (7 × its angle).
      const psi = ((PP * phi * 180) / Math.PI) % 360;
      const sector = Math.floor(((psi + 30) % 360) / 60);          // 0:+A 1:−C 2:+B 3:−A 4:+C 5:−B
      const ph = [0, 2, 1, 0, 2, 1][sector], sign = [1, -1, 1, -1, 1, -1][sector];
      const cm = M.metal(new THREE.Color(PCOL[ph]).multiplyScalar(0.55).getHex(), { roughness: 0.4, metalness: 0.6, emissive: new THREE.Color(0), emissiveIntensity: 1 });
      const coil = torus(0.3, 0.1, cm, 24); coil.rotation.y = Math.PI / 2; coil.scale.set(1.7, 1, 1); coil.position.x = 1.62; holder.add(coil);
      teeth.push({ phi, ph, sign, iron, cm });
    }
    // Hall sensors: three chips between teeth, 120 electrical degrees apart.
    const halls = [0, 1, 2].map((k) => {
      const phi = ((k * 120 + 15) / PP) * (Math.PI / 180) + (TAU / NT) * 0.5 * 0;
      const m = M.glow(0x333333); const c = box(0.2, 0.2, 0.2, m);
      c.position.set(Math.cos(phi) * (RT + 0.02), Math.sin(phi) * (RT + 0.02), 0.5); stator.add(c); return { phi, m };
    });
    // Phase wires out of the axle to a small controller box.
    const ctrl = new THREE.Group(); ctrl.position.set(MX - 0.2, MY - 4.6, 0.6); rig.add(ctrl);
    ctrl.add(box(2.6, 0.7, 1.0, M.metal(0x9aa3b2, { roughness: 0.4 })));
    const sw = [];
    for (let i = 0; i < 3; i++) { const m = M.glow(0x333333); const l = box(0.5, 0.16, 0.1, m); l.position.set(-0.8 + i * 0.8, 0.12, 0.52); ctrl.add(l); const m2 = M.glow(0x333333); const l2 = box(0.5, 0.16, 0.1, m2); l2.position.set(-0.8 + i * 0.8, -0.15, 0.52); ctrl.add(l2); sw.push([m, m2]); }
    const wires = [0, 1, 2].map((i) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8), M.plastic(PCOL[i])); w.position.set(MX - 0.5 + i * 0.25, MY - 2.9, 1.0); return w; });
    wires.forEach((w) => rig.add(w));

    const L = (t, pos, parent = rig, cls = '') => stage.label(t, pos, parent, cls);
    const lMag = L('Magnets on the wheel (turn)', [MX - 2.6, MY + 3.5, 0.5]);
    const lSt = L('Stator coils on the axle (fixed)', [MX + 2.2, MY - 2.2, 1.0]);
    const lHall = L('Hall sensors', [MX + 0.9, MY + 1.5, 1.0]);
    const lCtrl = L('Controller: 6 switches', [MX - 0.2, MY - 5.4, 1.2], rig, 'hot');
    const lStep = L('', [MX, MY, 1.3], rig, 'hot');

    // Chart: torque at the wheel against speed, for the chosen battery, with the road's need.
    const st = { v: 0, I: 0, T: 0, lim: 'current', step: 0, code: '000', dispA: 0, volts: 60 };
    const BW = 6.4, BH = 4.6;
    const chart = board(root, BW, BH, 720, 520, (g, w, h) => {
      panelBg(g, w, h);
      const P = PACKS[st.volts];
      title(g, 'Torque at the wheel', `${P.V.toFixed(1)} V battery · dashed: what the road needs`, 32);
      const A = axes(g, w, h, { xMax: 100, yMax: 130, xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 40, 80, 120], xFmt: (v) => v, yFmt: (v) => v, xLabel: 'km/h →', yLabel: 'N·m', y1: 122, font: 26, x0: 84 });
      for (const [vv, c, wd] of [[48, 'rgba(255,255,255,.18)', 3], [60, 'rgba(255,255,255,.18)', 3], [72, 'rgba(255,255,255,.18)', 3], [st.volts, '#8ef0ff', 6]]) {
        const pts = []; for (let k = 0; k <= 200; k++) { const kmh = k * 0.5, mt = maxTorque((kmh / KMH) / VEH.R, PACKS[vv].V); if (mt.T <= 0 && k) { pts.push([kmh, 0]); break; } pts.push([kmh, mt.T]); }
        line(g, pts, A.X, A.Y, c, wd);
      }
      const need = []; for (let k = 0; k <= 100; k++) need.push([k, roadLoad(k, st.slope, MASS).F * VEH.R]);
      line(g, need, A.X, A.Y, 'rgba(255,255,255,.55)', 3, [10, 8]);
      text(g, 'full torque from standstill', A.X(3), A.Y(119), '#8ef0ff', 'bold 24px sans-serif');
      dot(g, A.X(clamp(st.v * KMH, 0, 100)), A.Y(clamp(st.T, 0, 130)), '#ffb547', 14);
    }, [4.5, 4.0, 0]);

    const frame = framer(stage, (mode) => VIEWS[mode]);
    let rotA = 0, redraw = 0, lastV = -1, placed = '';
    const api = { stop(kmh = 0) { st.v = kmh / KMH; } };
    const bright = new THREE.Color();
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        const mode = frame();
        const lk = mode + stage.camera.aspect.toFixed(2);
        if (lk !== placed) { placed = lk; const sp = SPOTS[mode]; screenPlace(stage, VIEWS[mode], sp.rig[0], sp.rig[1], rig, 0, 1, false); rig.scale.setScalar(sp.k || 1); screenPlace(stage, VIEWS[mode], sp.chart[0], sp.chart[1], chart.mesh, sp.chart[2], BH); }
        const P = PACKS[s.volts]; st.volts = s.volts; st.slope = s.slope;
        // Vehicle: throttle asks for a share of the maximum current; the controller gives what it can.
        const w = st.v / VEH.R, mt = maxTorque(w, P.V);
        const Iask = (s.throttle / 100) * MOTOR.Imax;
        const I = Math.min(Iask, mt.I);
        st.lim = Iask <= mt.I ? 'throttle' : mt.lim;
        st.I = I; st.T = Math.max(0, MOTOR.Ke * I - (w > 0.01 ? MOTOR.fe : 0));
        const rl = roadLoad(st.v * KMH, s.slope, MASS);
        const F = st.T / VEH.R - rl.F;
        st.v = Math.max(0, st.v + (F / MASS) * dt);
        // Turn the rotor (slowed) and commutate from the shown angle.
        rotA += (st.v / VEH.R) * SLOW * dt;
        rotor.rotation.z = rotA;
        // Rotor field (outward flux) at electrical angle PP·rotA + 180°; the stator field leads it by 90°.
        const thE = ((PP * rotA * 180) / Math.PI) % 360, rotorField = thE + 180;
        // Hall code (magnet polarity under each sensor).
        const code = halls.map((h) => (Math.cos(PP * h.phi - (PP * rotA)) > 0 ? 1 : 0));
        halls.forEach((h, i) => h.m.color.set(code[i] ? 0xffffff : 0x333333));
        st.code = code.join('');
        // Phase axes sit at about 345° (A), 105° (B) and 225° (C), so step k points the field at −45° + 60°·k.
        const step = Math.round((((rotorField + 90 + 45) % 360) + 360) % 360 / 60) % 6;
        st.step = step;
        const on = I > 0.5;
        const cur = STEPS[step].map((c) => (on ? c : 0));
        const lvl = clamp(I / MOTOR.Imax, 0.25, 1);
        teeth.forEach((t) => {
          const c = cur[t.ph] * t.sign;
          t.iron.emissive.copy(c > 0 ? bright.set(COL.N) : c < 0 ? bright.set(COL.S) : bright.set(0)).multiplyScalar(c ? 0.55 * lvl : 0);
          t.cm.emissive.copy(bright.set(PCOL[t.ph])).multiplyScalar(cur[t.ph] ? 0.8 * lvl : 0);
        });
        sw.forEach(([hi, lo], i) => { hi.color.set(cur[i] > 0 ? PCOL[i] : 0x333333); lo.color.set(cur[i] < 0 ? PCOL[i] : 0x333333); });
        wires.forEach((wm, i) => { wm.material.emissive = wm.material.emissive || new THREE.Color(); wm.material.emissive.set(cur[i] ? PCOL[i] : 0x000000); wm.material.emissiveIntensity = cur[i] ? 0.7 : 0; });
        const sgn = (c) => (c > 0 ? '+' : c < 0 ? '−' : '·');
        lStep.element.innerHTML = on ? `Step ${step + 1} of 6: ${PH.map((p, i) => p + sgn(cur[i])).join(' ')}` : 'Throttle closed: no current';
        lStep.position.set(MX, MY - 0.0, 1.3);
        if (++redraw % 4 === 0 || lastV < 0) { chart.redraw(); lastV = st.v; }
        fitNarrow(stage, [lHall, lSt, lMag], 0);
      },
      readout: (s) => {
        const P = PACKS[s.volts], w = st.v / VEH.R, kmh = st.v * KMH;
        const m = motorPower(st.T, w, P.V), rpm = (w * 60) / TAU;
        const lim = { throttle: 'your throttle', current: 'current limit (full torque)', power: 'battery power limit', voltage: 'voltage: back-EMF has caught up' }[st.lim];
        return rows(`${Math.round(kmh)} km/h`, [
          ['Torque at the wheel', `${fmt0(st.T)} N·m`],
          ['Motor current', `${fmt0(st.I)} A`],
          ['Back-EMF', `${fmt1(MOTOR.Ke * w)} V of ${P.V.toFixed(1)} V`],
          ['From the battery', `${fmt1(Math.max(0, m.Ib))} A, ${fmt1(Math.max(0, m.Pbat) / 1000)} kW`],
          ['Limited by', lim],
          ['Voltage ceiling', `about ${fmt0(voltSpeed(P.V))} km/h`],
        ], 'Illustrative motor, 170 kg with rider. Makers also set a speed limit in the controller: never tamper with it.', 3);
      },
    };
  },
};
