// Chapter 2: from one cell to a pack. Cells in parallel add capacity (Ah); groups in series add
// voltage; energy = V × Ah. Cell figures: CELLS in scooter.js (typical datasheet values). The BMS
// watches every series group and opens the pack's switch on over-voltage, under-voltage,
// over-current or over-temperature (the protections required of traction batteries in India by
// AIS-156 Amendment 3, and of BMS designs generally). Passive balancing bleeds the fullest group
// through a resistor; real balancing currents are tens of milliamps, so it is shown sped up.
import { THREE, M, box, beam, tube, swarm, approach, clamp } from '../kit.js';
import { CELLS, pack, ocv, ride, USABLE, framer, fitNarrow, rows, fmt0, fmt1, COL } from '../scooter.js';

const S = 40;                                   // scene units per metre in this chapter
const FAULTS = {
  none: null,
  hot: { why: 'A cell group passed 60 °C', short: 'Too hot' },
  amps: { why: 'Current above the pack’s limit', short: 'Too much current' },
  over: { why: 'A cell group passed 4.25 V while charging', short: 'Overcharged' },
  flat: { why: 'A cell group fell to its cut-off voltage', short: 'Too flat' },
};

export default {
  id: 'pack',
  short: 'Cell to pack',
  title: 'From one cell to a battery pack',
  subtitle: 'Cells side by side add capacity. Groups in a chain add voltage.',
  view: { pos: [3.0, 13.5, 20.0], target: [0, 0.5, 0] },
  learn: `<p>Each cylinder is one <b>lithium-ion cell</b>. Inside, lithium ions shuttle between a graphite layer and a metal-oxide layer, and electrons go round the outside circuit to keep things balanced. RedoxClear shows that chemistry. One cell gives only about <b>3.6 V</b>: 4.2 V full, about 3.0 V empty.</p>
    <p>To get more, cells are wired two ways. Cells side by side, <b>in parallel</b>, share the same voltage but add up their charge: ten 5 Ah cells make a 50 Ah <b>group</b>. Groups joined end to end, <b>in series</b>, add up their voltages: sixteen groups make 16 × 3.6 = <b>57.6 V</b>. KirchhoffClear explains why.</p>
    <p>The energy is voltage × charge: 57.6 V × 50 Ah = 2,880 Wh, or <b>2.88 kWh</b>. That is what decides how far you can ride.</p>
    <p>A chain is only as good as its weakest link. If one group fills up first, charging must stop or that group is overcharged. So the <b>BMS</b> measures every group. It <b>balances</b> them by gently draining the fullest, and it opens the pack's switch if any group gets too full, too flat, too hot, or if too much current flows. A <b>fuse</b> is the last line of defence. These protections are what keep a pack safe, and they must never be bypassed or tampered with.</p>
    <p class="tip"><b>Try it:</b> add cells in series and in parallel and watch the volts and kWh. Then knock one group out of balance, and trigger a fault.</p>`,
  terms: [
    { t: 'Series', d: 'Joined end to end, plus to minus. Voltages add; the same current flows through each.' },
    { t: 'Parallel', d: 'Joined side by side, plus to plus. Voltage stays the same; charge (Ah) adds.' },
    { t: 'Ah', d: 'Amp-hours: how much charge a cell or group holds. 50 Ah could give 50 A for one hour.' },
    { t: 'kWh', d: 'Kilowatt-hours of energy: volts × amp-hours ÷ 1,000.' },
    { t: 'Balancing', d: 'The BMS draining or topping up groups so they all reach full together.' },
    { t: 'Nominal voltage', d: 'A cell’s average voltage as it empties: 3.6–3.7 V for NMC cells, 3.2 V for LFP.' },
  ],
  defaults: { cell: 'nmc21700', nS: 16, nP: 10, soc: 70, fault: 'none' },
  controls: [
    { key: 'cell', type: 'seg', label: 'Cell', options: [{ v: 'nmc21700', label: '21700 NMC' }, { v: 'nmc18650', label: '18650 NMC' }, { v: 'lfp32700', label: '32700 LFP' }], fmt: (v) => { const c = CELLS[v]; return `${c.vNom} V, ${c.ah} Ah, ${c.g} g`; } },
    { key: 'nS', type: 'range', label: 'Groups in series', min: 4, max: 20, step: 1, fmt: (v) => v + 'S' },
    { key: 'nP', type: 'range', label: 'Cells in parallel per group', min: 1, max: 12, step: 1, fmt: (v) => v + 'P' },
    { key: 'soc', type: 'range', label: 'State of charge', min: 0, max: 100, step: 1, fmt: (v) => Math.round(v) + '%' },
    { key: 'go', type: 'buttons', label: 'Balancing', items: [{ label: 'Knock group 3 out of balance', act: (s, inst) => inst.unbalance() }] },
    { key: 'fault', type: 'seg', label: 'Test the BMS', options: [{ v: 'none', label: 'All normal' }, { v: 'hot', label: 'Too hot' }, { v: 'amps', label: 'Too much current' }, { v: 'over', label: 'Overcharged' }, { v: 'flat', label: 'Too flat' }] },
  ],
  quiz: [
    { q: 'Sixteen 3.6 V groups in series, each of ten 5 Ah cells in parallel. What is the pack?', options: ['3.6 V, 800 Ah', '57.6 V, 50 Ah', '57.6 V, 5 Ah', '36 V, 80 Ah'], answer: 1, why: 'Series adds voltage: 16 × 3.6 = 57.6 V. Parallel adds charge: 10 × 5 = 50 Ah. That is 2.88 kWh.' },
    { q: 'Why does a BMS balance the groups?', options: ['To make the scooter faster', 'So no group is overcharged or over-drained while the others are not', 'To cool the motor', 'To charge from the sun'], answer: 1, why: 'In a series chain, the first group to fill or empty sets the limit. Keeping them level protects every cell.' },
    { q: 'A cell group gets too hot. What does the BMS do?', options: ['Nothing, it only shows a number', 'Opens the pack’s switch to stop the current', 'Turns on the headlight', 'Speeds up the charger'], answer: 1, why: 'Cutting the current is its job. That protection must never be bypassed.' },
  ],
  reel: [
    { ms: 5400, caption: 'Cells in parallel add capacity; groups in series add voltage. Sixteen groups of ten make 57.6 volts and 2.88 kWh.', set: { cell: 'nmc21700', nP: 10, soc: 70, fault: 'none' }, anim: { nS: [4, 16] }, spin: 0.25 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const holder = new THREE.Group(); root.add(holder);
    let built = null;
    const unbal = { k: 0 };       // extra state of charge in group 3 (index 2), as a fraction
    const BMSZ = -7.0;
    // BMS board, fuse and main switch, output leads (fixed), placed relative to the pack's size.
    const bms = new THREE.Group(); root.add(bms);
    const boardM = box(6, 0.12, 1.6, M.plastic(0x1f6f4a)); bms.add(boardM);
    const chips = []; for (let i = 0; i < 6; i++) { const c = box(0.5, 0.18, 0.5, M.plastic(0x15171c)); c.position.set(-2.3 + i * 0.9, 0.12, 0.2); bms.add(c); chips.push(c); }
    const bleedMat = M.glow(0x332211); const bleed = box(0.6, 0.15, 0.25, bleedMat); bleed.position.set(1.8, 0.14, -0.5); bms.add(bleed);
    const swMat = M.glow(0x5ce1a9); const sw = box(0.9, 0.3, 0.6, swMat); sw.position.set(3.6, 0.2, 0); bms.add(sw);
    const fuse = box(0.9, 0.3, 0.35, M.plastic(0xe6e0d0)); fuse.position.set(4.8, 0.2, 0); bms.add(fuse);
    const leads = [tube([[5.3, 0.2, 0], [6.6, 0.4, 0.4], [7.6, 0.4, 1.4]], 0.12, M.plastic(0xd33b3b)), tube([[5.3, 0.2, -0.4], [6.6, 0.4, -0.2], [7.6, 0.4, 0.6]], 0.12, M.plastic(0x1d1f24))];
    leads.forEach((l) => bms.add(l));
    const lBms = stage.label('BMS: watches every group', [-2.4, 0.9, 0], bms, 'hot');
    const lSw = stage.label('Switch', [3.6, 0.9, 0], bms);
    const lFuse = stage.label('Fuse', [4.9, -0.5, 0.6], bms);
    const lBleed = stage.label('Balancing resistor', [1.8, 0.8, -0.8], bms);
    const lOut = stage.label('To the controller', [7.6, 1.2, 1.6], bms);
    const lP = stage.label('', [0, 0, 0], root, 'hot');
    const lS = stage.label('', [0, 0, 0], root, 'hot');

    function rebuild(s) {
      if (built) { holder.remove(built.g); built.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
      const cell = CELLS[s.cell], d = cell.d * S, h = cell.h * S, pitch = d * 1.12;
      const g = new THREE.Group(); holder.add(g);
      const nS = s.nS, nP = s.nP, W = nS * pitch, D = nP * pitch;
      const x0 = -W / 2 + pitch / 2, z0 = -D / 2 + pitch / 2;
      const body = swarm(nS * nP, new THREE.CylinderGeometry(d / 2 * 0.96, d / 2 * 0.96, h, 18), M.plastic(0xffffff, { roughness: 0.4 }));
      const capP = swarm(nS * nP, new THREE.CylinderGeometry(d * 0.2, d * 0.2, 0.06, 12), M.metal(0xd8dde6));
      const col = new THREE.Color();
      for (let i = 0; i < nS; i++) for (let j = 0; j < nP; j++) {
        const k = i * nP + j, up = i % 2 === 0;
        body.place(k, [x0 + i * pitch, h / 2, z0 + j * pitch]);
        body.setColorAt(k, col.set(i % 2 ? 0x2f6fb0 : 0x2a62a0));
        capP.place(k, [x0 + i * pitch, up ? h + 0.03 : -0.03, z0 + j * pitch]);
      }
      body.done(); capP.done(); if (body.instanceColor) body.instanceColor.needsUpdate = true;
      g.add(body, capP);
      // Nickel strips: top joins groups (0,1), (2,3)…; bottom joins (1,2), (3,4)…; and each group's own cells.
      const nick = M.metal(0xc9ced6, { roughness: 0.35 });
      const strips = swarm(Math.max(1, (nS - 1) * nP), new THREE.BoxGeometry(pitch * 1.6, 0.05, d * 0.42), nick);
      for (let i = 0; i < nS - 1; i++) for (let j = 0; j < nP; j++) strips.place(i * nP + j, [x0 + (i + 0.5) * pitch, i % 2 === 0 ? h + 0.07 : -0.07, z0 + j * pitch]);
      strips.done(); g.add(strips);
      const rails = swarm(nS, new THREE.BoxGeometry(d * 0.3, 0.05, D - pitch * 0.4), nick);
      for (let i = 0; i < nS; i++) rails.place(i, [x0 + i * pitch, i % 2 === 0 ? h + 0.09 : -0.09, 0]);
      rails.done(); g.add(rails);
      // End terminals
      const tA = box(pitch * 0.8, 0.06, D - pitch * 0.3, M.metal(0xd33b3b)); tA.position.set(x0 + (nS - 1) * pitch, (nS - 1) % 2 === 0 ? h + 0.07 : -0.07, 0); g.add(tA);
      const tB = box(pitch * 0.8, 0.06, D - pitch * 0.3, M.metal(0x3a3f4a)); tB.position.set(x0, h + 0.07, 0); g.add(tB);
      // Group level bars (voltage) behind each group, and balance wires to the BMS.
      const bars = [], barMats = [];
      for (let i = 0; i < nS; i++) {
        const m = M.glow(0x5ce1a9); const b = box(pitch * 0.7, 1, 0.3, m); b.position.set(x0 + i * pitch, h + 0.6, -D / 2 - 0.5); g.add(b); bars.push(b); barMats.push(m);
        g.add(tube([[x0 + i * pitch, h + 0.1, -D / 2 + 0.2], [x0 + i * pitch, h + 0.4, -D / 2 - 1.0], [(x0 + i * pitch) * 0.25, 0.3, BMSZ + 0.8]], 0.03, M.plastic(0xffd166), false, 16));
      }
      // Temperature sensors: small dots on four cells.
      const sens = [[0.2, 0.3], [0.8, 0.7], [0.4, 0.8], [0.6, 0.2]].map(([a, b]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.12, d * 0.18), 10, 8), M.glow(0xff9a3d)); m.position.set(x0 + Math.round(a * (nS - 1)) * pitch, h + 0.15, z0 + Math.round(b * (nP - 1)) * pitch); g.add(m); return m; });
      // A current path: dots that zigzag through the groups.
      const NF = 40, flow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), M.glow(0xffd166), NF); flow.frustumCulled = false; g.add(flow);
      bms.position.set(0, 0.3, BMSZ - Math.max(0, D / 2 - 3));
      bms.scale.setScalar(clamp(W / 14, 0.7, 1.3));
      lP.position.set(x0 + pitch * 0.5 - pitch, h + 1.2, z0 + D / 2);
      lS.position.set(0, h + 3.4, -D / 2 - 0.5);
      built = { g, cell, nS, nP, W, D, h, x0, z0, pitch, bars, barMats, flow, sens, key: s.cell + nS + 'x' + nP };
    }

    const VIEW = (mode, W, D) => {
      const span = Math.max(W, D * 1.3, 12);
      const k = mode === 'tall' ? 0.45 : mode === 'narrow' ? 0.85 : 0.95;
      const tx = mode === 'wide' ? -span * 0.16 : 0, ty = mode === 'wide' ? span * 0.24 : span * 0.25;
      return { pos: [tx + span * 0.1, ty + span * 0.55 * k + 2, span * 1.15 * k + 6], target: [tx, ty, -1.5] };
    };
    const frame = framer(stage, (mode, key) => VIEW(mode, built ? built.W : 14, built ? built.D : 8));
    const st = { cut: null, flowT: 0, groupV: [] };
    const api = { unbalance() { unbal.k = 0.12; } };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        s.nS = Math.round(s.nS); s.nP = Math.round(s.nP);
        const key = s.cell + s.nS + 'x' + s.nP;
        if (!built || built.key !== key) rebuild(s);
        const B = built, cell = B.cell;
        frame(Math.round(B.W / 3) + '|' + Math.round(B.D / 3));
        // Group voltages.
        const soc = s.soc / 100;
        const fault = FAULTS[s.fault];
        st.cut = fault ? fault : null;
        // Balancing: bleed group 3 down while the pack is otherwise healthy (shown about 600× faster).
        if (unbal.k > 0 && !st.cut) unbal.k = Math.max(0, unbal.k - dt * 0.012);
        let vmax = 0;
        for (let i = 0; i < B.nS; i++) {
          let gs = soc + (i === 2 ? unbal.k : 0);
          let v = ocv(cell, gs);
          if (s.fault === 'over' && i === 2) v = cell.vMax + 0.06;
          if (s.fault === 'flat' && i === 5 % B.nS) v = cell.vMin;
          st.groupV[i] = v; vmax = Math.max(vmax, v);
          const k = clamp((v - cell.vMin) / (cell.vMax + 0.1 - cell.vMin), 0.02, 1.1);
          B.bars[i].scale.y = 0.2 + 2.2 * k; B.bars[i].position.y = B.h + 0.3 + (0.2 + 2.2 * k) / 2;
          const bad = (s.fault === 'over' && i === 2) || (s.fault === 'flat' && i === 5 % B.nS);
          B.barMats[i].color.set(bad ? 0xff4b4b : i === 2 && unbal.k > 0.005 ? 0xffd166 : 0x5ce1a9);
        }
        st.groupV.length = B.nS;
        const hot = s.fault === 'hot';
        B.sens.forEach((m, i) => { m.material.color.set(hot && i === 1 ? 0xff2a2a : 0xff9a3d); m.scale.setScalar(hot && i === 1 ? 1.6 + 0.4 * Math.sin(performance.now() / 120) : 1); });
        bleedMat.color.set(unbal.k > 0.005 && !st.cut ? 0xff7a3d : 0x332211);
        swMat.color.set(st.cut ? 0xff4b4b : 0x5ce1a9);
        sw.position.y = st.cut ? 0.55 : 0.2;
        // Current flow (stops when the BMS opens the switch).
        st.flowT += dt * (st.cut ? 0 : s.fault === 'amps' ? 0 : 0.35);
        const pts = (u) => {
          const x = B.x0 + u * (B.nS - 1) * B.pitch, seg = u * (B.nS - 1), i = Math.floor(seg), f = seg - i;
          const yTop = B.h + 0.25, yBot = -0.25; const y = i % 2 === 0 ? yTop : yBot;
          return [x, f < 0.5 ? y : (y === yTop ? yBot : yTop) * 0 + y, 0];
        };
        for (let k = 0; k < 40; k++) {
          const u = ((k / 40 + st.flowT) % 1);
          const [x, y] = pts(u);
          const m = new THREE.Matrix4().makeTranslation(x, y, (k % 3 - 1) * B.pitch * Math.min(2, B.nP / 3));
          B.flow.setMatrixAt(k, m);
        }
        B.flow.instanceMatrix.needsUpdate = true; B.flow.visible = !st.cut;
        const P = pack(cell, B.nS, B.nP);
        lP.element.textContent = `${B.nP} in parallel: ${(B.nP * cell.ah).toFixed(1)} Ah`;
        lS.element.textContent = `${B.nS} groups in series: ${(P.V).toFixed(1)} V`;
        lSw.element.textContent = st.cut ? 'Switch OPEN' : 'Switch closed';
        lBms.element.textContent = st.cut ? 'BMS: cut off! ' + st.cut.short : unbal.k > 0.005 ? 'BMS: balancing group 3' : 'BMS: all groups OK';
        lBleed.visible = unbal.k > 0.005;
        fitNarrow(stage, [lFuse, lOut, lBleed, lSw, lBms], -0.1);
      },
      readout: (s) => {
        const cell = CELLS[s.cell], P = pack(cell, s.nS, s.nP), r = ride(40, 0, 170, P);
        const Vnow = st.groupV.reduce((a, b) => a + b, 0);
        const status = st.cut ? [`BMS`, `<span class="no">cut off: ${st.cut.why}</span>`] : ['BMS', unbal.k > 0.005 ? 'balancing group 3' : '<span class="ok">all groups within limits</span>'];
        return rows(`${P.kWh.toFixed(2)} kWh`, [
          ['Pack', `${P.V.toFixed(1)} V × ${fmt1(P.Ah)} Ah`],
          ['Full / empty', `${P.Vmax.toFixed(1)} V / ${P.Vmin.toFixed(1)} V`],
          ['Right now', `${Vnow.toFixed(1)} V at ${Math.round(s.soc)}%`],
          ['Cells', `${P.n}, about ${fmt1(P.kg)} kg`],
          ['Range at 40 km/h', P.V < 30 ? 'too few volts for this motor' : `about ${fmt0(r.range)} km`],
          status,
        ], `Range uses ${Math.round(USABLE * 100)}% of the energy, a 170 kg scooter and rider, on the flat (chapter 4 explains).`, 3);
      },
    };
  },
};
