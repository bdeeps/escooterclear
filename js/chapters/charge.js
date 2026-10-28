// Chapter 5: energy back from braking, and energy in from the socket.
// Regeneration: regenStop() in scooter.js (rear hub motor as generator, at most 0.12 g and 2.5 kW,
// fading below 8 km/h, 80% of what it takes reaches the cells). From 40 km/h the 170 kg scooter and
// rider carry ½mv² = 10.5 kJ, about 2.9 Wh: enough for roughly a hundred metres.
// Charging: chargeSim() (CC-CV) on the 16S10P pack; the charger's DC output is the reader's choice.
// Wall current = DC power ÷ 90% ÷ 230 V. A charger of 1.4 kW draws about 7 A, well inside a
// 15 A (16 A) socket circuit; see MCBClear and ExtensionBoardClear.
import { THREE, M, box, tube, arrow, approach, clamp } from '../kit.js';
import { makeScooter, makeRider, regenStop, chargeSim, ride, PACK, VEH, KMH, G, CHARGER_ETA, board, panelBg, title, axes, line, dot, text, hbar, framer, fitNarrow, rows, screenPlace, fmt0, fmt1, hm, COL, hex } from '../scooter.js';

const V0 = { wide: { pos: [1.5, 6.2, 15.5], target: [-1.4, 5.0, 0] }, narrow: { pos: [1.5, 4.6, 17], target: [0.2, 3.2, 0] }, tall: { pos: [1.5, 6.0, 11], target: [0.2, 4.6, 0] } };
const V1 = { wide: { pos: [-0.5, 6.2, 16.5], target: [-3.2, 4.4, 0] }, narrow: { pos: [-1.5, 4.6, 17], target: [-2.6, 3.2, 0] }, tall: { pos: [-0.5, 6.0, 12], target: [-1.6, 4.6, 0] } };
const VIEWS = { regen: V0, charge: V1 };
const SPOTS = { wide: [0.5, 0.52, 0.62], narrow: [0, -0.6, 0.42], tall: [0, 0.52, 0.5] };
const CHG = { 0.35: '0.35 kW portable', 0.7: '0.7 kW standard', 1.4: '1.4 kW fast home' };

export default {
  id: 'charge',
  short: 'Braking and charging',
  title: 'Energy back, energy in',
  subtitle: 'The motor can charge the battery as you slow down. The socket does the rest, slowly at the end.',
  view: V0.wide,
  learn: `<p>Ease off the throttle or touch the brake and many e-scooters use the motor as a <b>generator</b>. The wheel spins the magnets past the coils, current flows back into the battery, and that pull slows you down: <b>regenerative braking</b>. FaradayClear and BrakeClear explain it.</p>
    <p>But it gives back less than people hope. Coming to a stop from 40 km/h, a scooter and rider hold only about <b>3 Wh</b> of motion energy, roughly what it takes to ride a hundred metres. Only the rear wheel's motor can regenerate, and it can't stop you hard. So the <b>friction brakes</b> still do the real stopping, and in a hard stop they turn almost all the motion into heat.</p>
    <p>Charging runs in two stages. First <b>constant current (CC)</b>: the charger pushes a steady current and the voltage creeps up. When the cells reach 4.2 V each, it switches to <b>constant voltage (CV)</b> and the current tapers off. That is why the <b>last 20% is slow</b>: the cells can't take charge fast when nearly full, and the BMS balances them.</p>
    <p>Most scooters charge from an ordinary <b>15 A three-pin socket</b> with a proper <b>earth</b>, on a circuit with its own MCB. Never use a thin extension board or a multi-plug adapter for it (MCBClear and ExtensionBoardClear show why), and only use the <b>charger approved for your scooter</b>.</p>
    <p>Cells slowly lose capacity. <b>Heat</b>, sitting for long at <b>100% or near 0%</b>, and lots of <b>fast charging</b> wear them faster. Parking in the shade and not leaving the battery flat helps it last.</p>
    <p class="tip"><b>Try it:</b> brake gently and then hard, and compare the energy that comes back. Then pick a charger and watch the CC-CV curve.</p>`,
  terms: [
    { t: 'Regenerative braking', d: 'Using the motor as a generator to slow down and put some energy back into the battery.' },
    { t: 'CC-CV charging', d: 'Constant current until the cells reach their full voltage, then constant voltage while the current falls.' },
    { t: 'C-rate', d: 'Charging current compared with capacity. 0.2C on a 50 Ah pack is 10 A.' },
    { t: 'Earth', d: 'The third, safety wire in a socket. It gives a fault current a safe path so the protection can trip.' },
    { t: 'Cycle life', d: 'How many full charges a battery gives before its capacity falls, often to 80%.' },
  ],
  defaults: { mode: 'regen', v0: 40, brake: 0.1, regen: true, kw: 0.7, soc0: 20, hours: 6 },
  controls: [
    { key: 'mode', type: 'seg', label: 'Look at', options: [{ v: 'regen', label: 'Braking' }, { v: 'charge', label: 'Charging' }] },
    { key: 'v0', type: 'range', label: 'Braking: start speed', min: 10, max: 70, step: 1, fmt: (v) => Math.round(v) + ' km/h' },
    { key: 'brake', type: 'range', label: 'Braking: how hard', min: 0.05, max: 0.7, step: 0.01, fmt: (v) => v.toFixed(2) + ' g' },
    { key: 'regen', type: 'toggle', label: 'Braking: regeneration on' },
    { key: 'kw', type: 'seg', label: 'Charging: charger', options: [{ v: 0.35, label: '0.35 kW' }, { v: 0.7, label: '0.7 kW' }, { v: 1.4, label: '1.4 kW' }], fmt: (v) => CHG[v] },
    { key: 'soc0', type: 'range', label: 'Charging: start at', min: 0, max: 90, step: 1, fmt: (v) => Math.round(v) + '%' },
    { key: 'hours', type: 'range', label: 'Charging: hours plugged in', min: 0, max: 9, step: 0.05, fmt: (v) => hm(v * 3600) },
  ],
  quiz: [
    { q: 'Why does regenerative braking give back only a little energy on a scooter?', options: ['Motors cannot work backwards', 'A scooter’s motion holds only a few watt-hours, and the friction brakes do most of the stopping', 'It only works uphill', 'The battery is always full'], answer: 1, why: 'From 40 km/h about 3 Wh is in motion. Only part of it can go back through the rear motor, and losses take a share.' },
    { q: 'Why is the last 20% of a charge slow?', options: ['The charger gets tired', 'In the constant-voltage stage the current tapers as the cells near full', 'The socket gives less power at night', 'The tyres need to cool'], answer: 1, why: 'Once the cells reach their full voltage, the charger holds it and the current falls away.' },
    { q: 'Which is safe practice for charging at home?', options: ['A thin extension board', 'Any charger that fits', 'The approved charger in a properly earthed 15 A socket', 'Covering the charger with a cloth'], answer: 2, why: 'Use the scooter’s approved charger, in an earthed socket on its own protected circuit, in an open, ventilated place.' },
  ],
  reel: [
    { ms: 5200, caption: 'Braking from 40 km/h, the motor turns generator but wins back under 2 watt-hours. The friction brakes still do the real stopping.', set: { mode: 'regen', v0: 40, brake: 0.1, regen: true }, act: (s, inst) => inst.replay(), spin: 0 },
    { ms: 5200, caption: 'Charging: constant current first, then constant voltage. The last 20% is slow because the current tapers.', set: { mode: 'charge', kw: 0.7, soc0: 20 }, anim: { hours: [0, 5.2] }, spin: 0.1 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const sc = makeScooter(); root.add(sc.group);
    const rider = makeRider(); rider.position.set(0.2, 0, 0); root.add(rider);
    const road = box(30, 0.2, 6, M.matte(0x2b2d33, { roughness: 0.9 })); road.position.set(0, -0.1, 0); root.add(road);
    const dashes = []; for (let i = 0; i < 11; i++) { const d = box(1.2, 0.02, 0.18, M.matte(0xd8d8d8)); d.position.set(-15 + i * 2.8, 0.01, 1.8); root.add(d); dashes.push(d); }
    const P = sc.parts;
    // Energy dots from the hub motor to the pack (regeneration) or from the charger to the pack.
    const NF = 18, flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), M.glow(hex(COL.energy)), NF); flow.frustumCulled = false; root.add(flow);
    const glowF = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), M.glow(0xff6a2a, { transparent: true, opacity: 0.0 })); glowF.position.set(2.6 + 0.0, VEH.R * 4 + 0.0, 0.4); root.add(glowF);
    // Wall socket for charging.
    const wall = box(0.2, 5, 6, M.matte(0xd9d4c7)); wall.position.set(-6.5, 2.5, 1.0); root.add(wall);
    const socket = new THREE.Group(); socket.position.set(-6.38, 1.6, 2.0); root.add(socket);
    socket.add(box(0.06, 0.9, 0.9, M.plastic(0xf2f2f2)));
    for (const [y, z, r] of [[0.18, 0, 0.09], [-0.12, -0.2, 0.06], [-0.12, 0.2, 0.06]]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 12), M.matte(0x111111)); h.rotation.z = Math.PI / 2; h.position.set(0.03, y, z); socket.add(h); }
    const swi = box(0.08, 0.3, 0.2, M.plastic(0xe04040)); swi.position.set(0.04, 0.2, 0.62); socket.add(swi);
    const cable = tube([[-6.3, 1.6, 2.0], [-5.5, 0.3, 2.3], [-1.5, 0.15, 2.4], [-0.6, 0.25, 2.4]], 0.05, M.plastic(0x1a1c20), false, 40); root.add(cable);
    const L = (t, pos, cls, parent = root) => stage.label(t, pos, parent, cls);
    const lMotor = L('', [-2.6, -0.6, 1.2], 'hot'), lPack = L('', [0.4, 0.4, 1.4], 'hot'), lBrake = L('', [3.6, 2.2, 1.0], 'hot');
    const lSock = L('15 A earthed socket, own MCB', [-6.3, 3.0, 2.0]), lChg = L('Approved charger', [-0.2, 0.9, 2.4], '', root);
    lMotor.element.style.setProperty('--c', COL.energy); lPack.element.style.setProperty('--c', COL.energy); lBrake.element.style.setProperty('--c', COL.heat);

    const cur = { s: null, sim: null, st: null };
    const chart = board(root, 7.4, 5.0, 740, 500, (g, w, h) => {
      panelBg(g, w, h);
      const s = cur.s; if (!s) return;
      if (s.mode === 'regen') {
        const st = cur.st;
        title(g, `Stopping from ${Math.round(s.v0)} km/h at ${s.brake.toFixed(2)} g`, `Motion energy ${fmt1(st.total / 3600)} Wh (${fmt1(st.total / 1000)} kJ) · 170 kg`, 28);
        const X0 = 300, X1 = w - 30, T = st.total;
        hbar(g, X0, X1, 120, 44, st.eB / T, COL.energy, 'Back in the battery', `${fmt1(st.eB / 3600)} Wh (${Math.round((100 * st.eB) / T)}%)`, 22);
        hbar(g, X0, X1, 178, 44, st.eF / T, COL.heat, 'Brake pads (heat)', `${fmt1(st.eF / 3600)} Wh`, 22);
        hbar(g, X0, X1, 236, 44, st.eR / T, COL.roll, 'Tyres and air', `${fmt1(st.eR / 3600)} Wh`, 22);
        hbar(g, X0, X1, 294, 44, (T - st.eB - st.eF - st.eR) / T, 'rgba(255,255,255,.5)', 'Motor, wiring losses', `${fmt1((T - st.eB - st.eF - st.eR) / 3600)} Wh`, 22);
        const per = ride(40).bat, metres = (st.eB / 3600 / per) * 1000;
        text(g, `Enough to ride about ${fmt0(metres)} m at 40 km/h.`, 26, 392, '#fff', 'bold 28px sans-serif');
        text(g, `Stopping distance ${fmt1(st.x)} m, ${fmt1(st.t)} s.`, 26, 434, COL.muted, '22px sans-serif');
        text(g, 'The motor can take about 0.12 g at most, and fades below 8 km/h.', 26, 470, COL.muted, '22px sans-serif');
      } else {
        const sim = cur.sim, end = sim.end.t / 3600;
        title(g, `CC-CV charging, ${CHG[s.kw]}`, `${PACK.V.toFixed(1)} V, ${PACK.kWh.toFixed(2)} kWh pack · constant current ${fmt1(sim.Icc)} A`, 28);
        const xMax = Math.max(2, Math.ceil(end + 0.5));
        const A = axes(g, w, h, { xMax, yMax: 100, xTicks: Array.from({ length: xMax + 1 }, (_, i) => i).filter((i) => xMax <= 10 || i % 2 === 0), yTicks: [0, 20, 40, 60, 80, 100], xLabel: 'hours →', yLabel: '%', y1: 116 });
        if (sim.cvAt) { g.fillStyle = 'rgba(255,209,102,.1)'; g.fillRect(A.X(sim.cvAt.t / 3600), A.y1, A.x1 - A.X(sim.cvAt.t / 3600), A.y0 - A.y1); text(g, 'CV: current tapers', A.X(sim.cvAt.t / 3600) + 8, A.y1 + 26, '#ffd166', '20px sans-serif'); }
        line(g, sim.pts.map((p) => [p.t / 3600, p.soc * 100]), A.X, A.Y, '#5ce1a9', 5);
        line(g, sim.pts.map((p) => [p.t / 3600, (p.I / sim.Icc) * 100]), A.X, A.Y, '#ffd166', 3);
        const now = Math.min(s.hours * 3600, sim.end.t), p = sim.pts.find((q) => q.t >= now) || sim.end;
        dot(g, A.X(now / 3600), A.Y(p.soc * 100), '#5ce1a9', 11);
        text(g, 'charge %', A.X(Math.min(end * 0.3, xMax)) + 10, A.Y(sim.pts[Math.floor(sim.pts.length * 0.3)].soc * 100) + 30, '#5ce1a9', 'bold 20px sans-serif');
        text(g, 'current (% of CC)', A.X(0.1), A.Y(100) + 26, '#ffd166', 'bold 20px sans-serif');
      }
    }, [10.2, 4.6, -2.0]);

    const frame = framer(stage, (mode, key) => VIEWS[key][mode]);
    let t = 0, play = 0, x = 0, key = '', placed = '';
    const api = { replay() { play = 0; } };
    const fl = new THREE.Matrix4();
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const mode = frame(s.mode);
        const lk = mode + s.mode + stage.camera.aspect.toFixed(2);
        if (lk !== placed) { placed = lk; const sp = SPOTS[mode]; screenPlace(stage, VIEWS[s.mode][mode], sp[0], sp[1], chart.mesh, sp[2], 5.0); }
        const regenMode = s.mode === 'regen';
        rider.visible = regenMode; road.visible = true; dashes.forEach((d) => { d.visible = regenMode; });
        wall.visible = socket.visible = cable.visible = P.charger.visible = !regenMode;
        lSock.visible = lChg.visible = !regenMode; lMotor.visible = lBrake.visible = regenMode;
        const nk = JSON.stringify([s.mode, s.v0, s.brake, s.regen, s.kw, s.soc0]);
        if (nk !== key) { key = nk; cur.s = { ...s }; cur.st = regenStop(s.v0, s.brake * G, s.regen); cur.sim = chargeSim(PACK, s.kw, s.soc0 / 100); play = 0; chart.redraw(); }
        else if (!regenMode) { cur.s.hours = s.hours; if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) chart.redraw(); }
        if (regenMode) {
          // Play the stop (in real time), then pause and repeat.
          play += dt;
          const st = cur.st, T = st.t;
          const tt = Math.min(play, T), v = Math.max(0, s.v0 / KMH - s.brake * G * tt);
          if (play > T + 1.6) play = 0;
          x += v * 4 * dt; dashes.forEach((d, i) => { d.position.x = ((-15 + i * 2.8 - (x % 2.8) + 30) % 30.8) - 15; });
          sc.setSpin(-x / (VEH.R * 4));
          const vk = v * KMH, fade = clamp(v / (8 / KMH), 0, 1);
          const motorA = s.regen ? Math.min(0.12 * G, v > 0.1 ? 2500 / (170 * v) : 0.12 * G) * fade : 0;
          const share = v > 0 ? Math.min(1, motorA / (s.brake * G)) : 0;
          for (let k = 0; k < NF; k++) {
            const u = (k / NF + t * 0.8) % 1;
            const a = [-2.6, VEH.R * 4, -0.2], b = [0.4, 0.9, 0];
            fl.makeTranslation(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI) * 0.6, a[2] + (b[2] - a[2]) * u);
            flow.setMatrixAt(k, fl);
          }
          flow.instanceMatrix.needsUpdate = true; flow.visible = share > 0.02 && v > 0;
          glowF.material.opacity = v > 0 ? clamp((1 - share) * s.brake * 2.2, 0, 0.85) : 0;
          lMotor.element.textContent = v > 0 && share > 0.02 ? `Motor as generator: ${Math.round(share * 100)}% of the braking` : 'Motor: not regenerating';
          lBrake.element.textContent = v > 0 ? `Friction brakes: ${Math.round((1 - share) * 100)}%` : 'Stopped';
          lPack.element.textContent = `Battery +${fmt1(cur.st.eB / 3600)} Wh per stop`;
          P.setDisplay(vk, 0.62, share > 0.02 && v > 0 ? 'REGEN' : '');
        } else {
          sc.setSpin(0);
          const sim = cur.sim, now = Math.min(s.hours * 3600, sim.end.t), p = sim.pts.find((q) => q.t >= now) || sim.end;
          const on = p.I > 0;
          for (let k = 0; k < NF; k++) {
            const u = (k / NF + t * 0.6 * (on ? 1 : 0)) % 1;
            const pts = [[-6.3, 1.6, 2.0], [-0.2, 0.3, 2.4], [0.4, 0.9, 0.6]];
            const seg = u < 0.6 ? 0 : 1, f = seg ? (u - 0.6) / 0.4 : u / 0.6, a = pts[seg], b = pts[seg + 1];
            fl.makeTranslation(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
            flow.setMatrixAt(k, fl);
          }
          flow.instanceMatrix.needsUpdate = true; flow.visible = on;
          glowF.material.opacity = 0;
          lPack.element.textContent = on ? `${Math.round(p.soc * 100)}%, charging at ${fmt1(p.I)} A` : `${Math.round(p.soc * 100)}%: done`;
          P.setDisplay(0, p.soc, on ? 'CHARGING' : 'FULL');
        }
        fitNarrow(stage, [lSock, lChg, lBrake], -0.05);
      },
      readout: (s) => {
        if (s.mode === 'regen') {
          const st = regenStop(s.v0, s.brake * G, s.regen);
          return rows(`${fmt1(st.eB / 3600)} Wh back`, [
            ['Motion energy at the start', `${fmt1(st.total / 3600)} Wh`],
            ['Share recovered', `${Math.round((100 * st.eB) / st.total)}%`],
            ['Into the brake pads as heat', `${fmt1(st.eF / 3600)} Wh`],
            ['Stopping distance', `${fmt1(st.x)} m`],
          ], 'Gentle braking recovers the most. In a hard stop, friction does almost all of it. Illustrative regen limits; real scooters differ.', 3);
        }
        const sim = chargeSim(PACK, s.kw, s.soc0 / 100), now = Math.min(s.hours * 3600, sim.end.t), p = sim.pts.find((q) => q.t >= now) || sim.end;
        const to80 = s.soc0 < 80 ? hm(sim.at(0.8)) : 'already there';
        return rows(`${Math.round(p.soc * 100)}% after ${hm(now)}`, [
          ['To 80%', to80],
          ['To full', hm(sim.end.t)],
          ['Current from the wall', `about ${fmt1(sim.wallA)} A at 230 V`],
          ['Into the cells', `${fmt1(p.I)} A`],
          ['Electricity used', `${fmt1(((p.soc - s.soc0 / 100) * PACK.kWh) / CHARGER_ETA / 0.97)} kWh`],
        ], 'Illustrative CC-CV model with typical constants. Follow your scooter’s manual; makers may slow charging when cells are hot or cold.', 3);
      },
    };
  },
};
