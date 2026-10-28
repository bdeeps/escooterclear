// Chapter 6: battery safety, rules and money.
// Pack safety layers as required in India by AIS-156 Amendment 3 (MoRTH; Phase 1 from 1 Dec 2022,
// Phase 2 from 31 Mar 2023, as reported from the ministry's notice): a microcontroller BMS,
// cell-to-cell spacing, an extra fuse, traceable cells, several temperature sensors and an
// audio-visual warning for thermal events. The overheat test below shows the BMS reacting; the
// time scale is illustrative.
// Central demand incentive for an electric two-wheeler, per kWh of battery (MHI notifications as
// reported): FAME II ₹10,000 (2019), ₹15,000 and a 40% cap (June 2021), ₹10,000 and a 15% cap
// (1 June 2023); EMPS 2024 ₹5,000 (April–September 2024); PM E-DRIVE ₹5,000 capped at ₹10,000
// (FY 2024–25), then ₹2,500 capped at ₹5,000 (from 1 April 2025; extended in 2026 to 31 March 2028).
import { THREE, M, box, beam, tube, swarm, approach, clamp } from '../kit.js';
import { board, panelBg, title, axes, line, dot, text, framer, fitNarrow, rows, screenPlace, COL, TAU } from '../scooter.js';

const SUBSIDY = [
  [2019.25, 10000, 'FAME II'], [2021.45, 15000, 'FAME II raised'], [2023.42, 10000, 'FAME II cut'], [2024.25, 5000, 'EMPS 2024'], [2024.75, 5000, 'PM E-DRIVE'], [2025.25, 2500, 'PM E-DRIVE year 2'], [2028.25, 2500, 'to Mar 2028'],
];
const VIEWS = { wide: { pos: [0.6, 9.0, 16.5], target: [-1.8, 3.2, 0] }, narrow: { pos: [1.0, 8.5, 15], target: [0.6, 3.4, 0] }, tall: { pos: [1.0, 7.0, 9.5], target: [0.6, 1.8, 0] } };
const NS = 6, NP = 4;

export default {
  id: 'safety',
  short: 'Safety and rules',
  title: 'Safety, rules and a short history',
  subtitle: 'Why packs are tested so hard, what the law says, and how India went electric.',
  view: VIEWS.wide,
  learn: `<p>A lithium-ion cell packs a lot of energy into a small can. If it is damaged, badly made, overcharged or gets too hot, it can start heating itself faster than it can cool down. That is <b>thermal runaway</b>, and it can spread to the cells next to it. This is why packs are designed, built and <b>tested</b> so carefully, and why the BMS, fuses, temperature sensors and the controller's speed limiter must <b>never be tampered with</b>.</p>
    <p>In March and April 2022 several electric scooters caught fire in India. The road transport ministry (<b>MoRTH</b>) set up an expert committee, and DRDO's fire-safety centre investigated; reports pointed to weak cells, poor BMS designs and pack layouts. MoRTH then added tougher battery rules to the <b>AIS-156</b> standard: a smarter BMS, space between cells, an extra fuse, several temperature sensors, traceable cells and a warning for the rider if a pack overheats. They came in two phases, from <b>1 December 2022</b> and <b>31 March 2023</b>.</p>
    <p>Official advice for charging (from the US safety agency CPSC and makers' manuals): use only the charger that came with the scooter or one the maker approves, stay nearby while it charges and don't charge while you sleep, unplug when done, and never use a damaged, swollen or reworked battery. Charge in an open, ventilated place and keep escape routes clear.</p>
    <p>On the road, an e-scooter is a motor vehicle: it needs registration, a licence, insurance and a <b>BIS-certified helmet</b>. Only very low-speed ones, with a top speed under <b>25 km/h</b> and a motor under <b>250 W</b> (and approved by a test agency), are outside those rules. A 2026 MoRTH draft proposes raising the power limit to 600 W.</p>
    <p>India paid buyers to switch: <b>FAME</b> from 2015, <b>FAME II</b> from 2019, and <b>PM E-DRIVE</b> from October 2024, each giving a set amount per kWh of battery.</p>
    <p class="tip"><b>Try it:</b> run the overheat test and watch the BMS react. Then switch to the subsidy chart.</p>`,
  terms: [
    { t: 'Thermal runaway', d: 'A cell heating itself faster than it can lose heat, which can spread to nearby cells.' },
    { t: 'AIS-156', d: 'India’s automotive safety standard for electric two- and three-wheelers, with tougher battery tests added in 2022–23.' },
    { t: 'Fuse', d: 'A weak link that melts and breaks the circuit if the current is far too high.' },
    { t: 'Speed limiter', d: 'A setting in the controller that caps top speed, part of how the vehicle was approved. Never tamper with it.' },
    { t: 'FAME, PM E-DRIVE', d: 'Indian government schemes that pay part of the price of electric vehicles.' },
  ],
  defaults: { show: 'pack', vehicle: 'scooter' },
  controls: [
    { key: 'show', type: 'seg', label: 'Look at', options: [{ v: 'pack', label: 'Pack safety' }, { v: 'money', label: 'Subsidy per kWh' }] },
    { key: 'go', type: 'buttons', label: 'Pack', items: [{ label: 'Run the overheat test', act: (s, inst) => inst.test() }, { label: 'Reset', act: (s, inst) => inst.reset() }] },
    { key: 'vehicle', type: 'seg', label: 'Rules for', options: [{ v: 'scooter', label: 'E-scooter' }, { v: 'low', label: 'Low-speed (under 25 km/h)' }] },
  ],
  quiz: [
    { q: 'What is thermal runaway?', options: ['A battery running out of charge', 'A cell heating itself faster than it can cool, which can spread', 'The motor overspeeding', 'A tyre overheating'], answer: 1, why: 'Damage, defects, overcharging or heat can start it. Good cells, a BMS, spacing and testing guard against it.' },
    { q: 'What did India change after the 2022 scooter fires?', options: ['Nothing', 'Banned electric scooters', 'Added tougher battery requirements to the AIS-156 standard, in two phases', 'Made all scooters slower'], answer: 2, why: 'MoRTH amended AIS-156: better BMS, cell spacing, fuses, temperature sensors and thermal warnings, from December 2022 and March 2023.' },
    { q: 'Which low-speed electric two-wheelers are outside registration rules in India?', options: ['Any under 60 km/h', 'Top speed under 25 km/h and motor under 250 W, approved by a test agency', 'Any with pedals', 'Any bought online'], answer: 1, why: 'The Central Motor Vehicles Rules exempt only these very low-speed, low-power vehicles. Faster ones need registration, a licence and a helmet.' },
  ],
  reel: [
    { ms: 5600, caption: 'Packs are built to fail safe: spaced cells, fuses, temperature sensors and a BMS that cuts the power. Never tamper with them.', set: { show: 'pack' }, act: (s, inst) => inst.test(), spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const S = 1.0, d = 0.9, h = 2.6, pitch = d * 1.45;      // big cells, wide spacing (shown not to scale)
    const packG = new THREE.Group(); root.add(packG);
    const W = NS * pitch + 0.8, D = NP * pitch + 0.8;
    const enc = box(W, 0.2, D, M.metal(0x6c7484, { roughness: 0.5 })); enc.position.y = -0.1; packG.add(enc);
    const wallMat = M.clear(0x9fb4c8, 0.16);
    for (const [x, z, w, dd] of [[0, -D / 2, W, 0.1], [0, D / 2, W, 0.1], [-W / 2, 0, 0.1, D], [W / 2, 0, 0.1, D]]) { const b = box(w, h + 0.6, dd, wallMat); b.position.set(x, (h + 0.6) / 2, z); b.castShadow = false; packG.add(b); }
    const x0 = -((NS - 1) * pitch) / 2, z0 = -((NP - 1) * pitch) / 2;
    const cellMats = [];
    for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) {
      const m = M.plastic(0x2f6fb0, { roughness: 0.4, emissive: new THREE.Color(0), emissiveIntensity: 1 });
      const c = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, h, 24), m); c.position.set(x0 + i * pitch, h / 2, z0 + j * pitch); c.castShadow = true; packG.add(c);
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.22, d * 0.22, 0.05, 16), M.metal(0xd8dde6)); vent.position.set(x0 + i * pitch, h + 0.03, z0 + j * pitch); packG.add(vent);
      cellMats.push({ m, i, j });
    }
    for (let i = 0; i < NS - 1; i++) for (let j = 0; j < NP; j++) { const st = box(pitch * 1.5, 0.05, d * 0.35, M.metal(0xc9ced6)); st.position.set(x0 + (i + 0.5) * pitch, i % 2 ? -0.02 : h + 0.07, z0 + j * pitch); packG.add(st); }
    const sensors = [[1, 1], [4, 2], [2, 3], [5, 0]].map(([i, j]) => { const m = M.glow(0xff9a3d); const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), m); s.position.set(x0 + i * pitch + d * 0.55, h * 0.6, z0 + j * pitch); packG.add(s); return { m, i, j }; });
    const bmsB = box(3.2, 0.12, 1.2, M.plastic(0x1f6f4a)); bmsB.position.set(0, h + 0.9, -D / 2 - 0.9); packG.add(bmsB);
    const swMat = M.glow(0x5ce1a9), sw = box(0.7, 0.3, 0.5, swMat); sw.position.set(W / 2 + 0.9, 0.6, 0); packG.add(sw);
    const fuse = box(0.6, 0.3, 0.3, M.plastic(0xe6e0d0)); fuse.position.set(W / 2 + 0.9, 0.6, 1.0); packG.add(fuse);
    const warnMat = M.glow(0x333333), warn = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14), warnMat); warn.position.set(W / 2 + 0.9, 2.4, 0); packG.add(warn);
    packG.add(tube([[0, h + 0.9, -D / 2 - 0.9], [W / 2 + 0.4, h + 0.4, -D / 2], [W / 2 + 0.9, 0.9, 0]], 0.04, M.plastic(0xffd166), false, 20));
    const L = (t, pos, cls) => stage.label(t, pos, packG, cls);
    const lab = {
      cells: L('Cells with gaps between them', [x0, h + 0.6, D / 2 + 0.3]),
      sens: L('Temperature sensors', [x0 + pitch * 4, h * 0.7, D / 2 + 0.5]),
      bms: L('BMS', [0, h + 1.4, -D / 2 - 0.9], 'hot'),
      sw: L('Switch', [W / 2 + 0.9, 1.15, -0.3]),
      fuse: L('Fuse', [W / 2 + 1.0, 0.95, 1.3]),
      warn: L('Rider warning', [W / 2 + 0.9, 3.0, 0]),
      vent: L('Vents on each cell', [x0 + pitch * 2, h + 0.5, -D / 2 - 0.2]),
      state: L('', [0, -1.2, D / 2 + 0.6], 'hot'),
    };

    // Subsidy board.
    const money = board(root, 9.0, 5.6, 960, 600, (g, w, hh) => {
      panelBg(g, w, hh);
      title(g, 'Central incentive per kWh for an electric two-wheeler', 'India, by the date a vehicle was registered (MHI schemes, as notified)', 28);
      const A = axes(g, w, hh, { xMin: 2019, xMax: 2028.5, yMax: 16000, xTicks: [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028], yTicks: [0, 5000, 10000, 15000], xFmt: (v) => "'" + String(v).slice(2), yFmt: (v) => '₹' + (v / 1000) + 'k', xLabel: 'year →', y1: 120 });
      const pts = []; for (let k = 0; k < SUBSIDY.length; k++) { const [x, y] = SUBSIDY[k]; if (k) pts.push([x, SUBSIDY[k - 1][1]]); pts.push([x, y]); }
      line(g, pts, A.X, A.Y, '#5ce1a9', 6);
      SUBSIDY.slice(0, -1).forEach(([x, y, lab], k) => { dot(g, A.X(x), A.Y(y), '#5ce1a9', 9); text(g, lab, A.X(x) + 8, A.Y(y) - 16 - (k % 2) * 24, '#e8eef8', '19px sans-serif'); });
      text(g, 'Caps per vehicle also changed: 40% of price in 2021, 15% from June 2023, ₹10,000 then ₹5,000.', 26, hh - 22, COL.muted, '19px sans-serif');
    }, [2.6, 3.6, -1.0]);

    const MV = { pos: [0, 3.8, 14], target: [0, 3.6, 0] }, MSPOT = { wide: [0.32, -0.32, 0.74], narrow: [0, -0.5, 0.5], tall: [0, 0, 0.6] };
    const frame = framer(stage, (mode, key) => (key === 'money' ? MV : VIEWS[mode]));
    let placed = '';
    const st = { t: -1, phase: 'ok' };
    const api = { test() { st.t = 0; }, reset() { st.t = -1; } };
    const hot = new THREE.Color(0xff3a1a);
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        const mode = frame(s.show);
        const showPack = s.show === 'pack';
        packG.visible = showPack; money.mesh.visible = !showPack;
        Object.values(lab).forEach((l) => { l.visible = showPack; });
        const lk = mode + stage.camera.aspect.toFixed(2);
        if (lk !== placed) { placed = lk; const sp = MSPOT[mode]; screenPlace(stage, MV, sp[0], sp[1], money.mesh, sp[2], 5.6); }
        // Overheat test: one cell (index 2,1) warms; a sensor next to it sees it; the BMS opens the switch
        // and warns the rider; the cell then cools.
        if (st.t >= 0) st.t += dt;
        const t = st.t, heat = t < 0 ? 0 : t < 2.2 ? t / 2.2 : Math.max(0, 1 - (t - 2.2) / 4);
        st.phase = t < 0 ? 'ok' : t < 1.6 ? 'warming' : t < 7 ? 'cut' : 'cooled';
        cellMats.forEach(({ m, i, j }) => {
          const near = Math.hypot(i - 2, j - 1);
          const k = near === 0 ? heat : near < 1.1 ? heat * 0.18 : 0;
          m.emissive.copy(hot).multiplyScalar(k * 0.9);
        });
        sensors.forEach(({ m, i, j }) => m.color.set(Math.hypot(i - 2, j - 1) < 1.5 && heat > 0.5 ? 0xff2a2a : 0xff9a3d));
        const cut = st.phase === 'cut';
        swMat.color.set(cut ? 0xff4b4b : 0x5ce1a9); sw.position.y = cut ? 0.95 : 0.6;
        warnMat.color.set(cut ? (Math.floor(performance.now() / 300) % 2 ? 0xffb547 : 0x553300) : 0x333333);
        lab.state.element.textContent = { ok: 'All cells normal', warming: 'One cell warming: the sensor sees it', cut: 'BMS opens the switch and warns the rider', cooled: 'Current stopped, cell cooling' }[st.phase];
        lab.sw.element.textContent = cut ? 'Switch OPEN' : 'Switch closed';
        fitNarrow(stage, [lab.vent, lab.fuse, lab.cells], -0.05);
      },
      readout: (s) => {
        if (s.vehicle === 'low') return rows('Low-speed: under 25 km/h, under 250 W', [
          ['Registration', 'not needed'],
          ['Driving licence', 'not needed'],
          ['Helmet', 'outside motor-vehicle rules; wear a BIS one anyway'],
          ['Condition', 'type-checked by a test agency'],
        ], 'Central Motor Vehicles Rules, rule 2(u): 30-minute motor power under 0.25 kW, top speed under 25 km/h. Scooters sold as “low-speed” that go faster are illegal on the road (MoRTH has warned states).', 3);
        return rows('E-scooter: a motor vehicle', [
          ['Registration', 'needed (green number plate)'],
          ['Driving licence', 'needed'],
          ['Insurance', 'needed'],
          ['Helmet', 'BIS-certified (IS 4151), rider and pillion'],
          ['Battery', 'AIS-156 tested (from 2022–23)'],
        ], 'Motor Vehicles Act, 1988 and CMVR, as administered by MoRTH and the states. Check your state transport department for current rules.', 3);
      },
    };
  },
};
