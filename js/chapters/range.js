// Chapter 4: range and efficiency. Steady riding on a straight road: rolling resistance
// (Crr 0.015), air drag (½ρ·CdA·v², CdA 0.6 m²) and climbing (m·g·sinθ) set the power at the wheel;
// the motor model (scooter.js), a 97% controller, the pack's resistance and a 90% charger take it
// back to the socket. Range = usable energy ÷ Wh per km taken from the cells. The petrol scooter
// is scooter.js's 110 cc CVT model (MotorcycleClear's engine model). Prices are the reader's inputs;
// the defaults are ₹7 per kWh (household tariffs in India mostly fall between about ₹3 and ₹10
// per kWh depending on state and slab) and ₹95 per litre (Delhi petrol was ₹94.77 in early 2026).
import { THREE, M, box, arrow, approach, clamp } from '../kit.js';
import { makeScooter, makeRider, ride, petrolRide, PACK, USABLE, VEH, KMH, CHARGER_ETA, MOTOR, board, panelBg, title, axes, line, dot, text, hbar, framer, fitNarrow, rows, screenPlace, fmt0, fmt1, COL, hex } from '../scooter.js';

const VIEWS = { wide: { pos: [1.5, 6.2, 15.5], target: [-1.4, 5.0, 0] }, narrow: { pos: [1.5, 4.6, 17], target: [0.2, 3.2, 0] }, tall: { pos: [1.5, 6.0, 11], target: [0.2, 4.6, 0] } };
const SPOTS = { wide: [0.5, 0.52, 0.62], narrow: [0, -0.6, 0.42], tall: [0, 0.52, 0.5] };

export default {
  id: 'range',
  short: 'Range and cost',
  title: 'How far, and for how much?',
  subtitle: 'Tyres, air and hills take the energy. Speed costs most of all.',
  view: VIEWS.wide,
  learn: `<p>Riding at a steady speed, the motor fights three things. <b>Rolling resistance</b> comes from the tyres squashing as they roll: about 1.5% of the weight, the same at any speed (CycleClear shows how thin bicycle tyres do better). <b>Air drag</b> grows with speed squared. <b>Climbing</b> lifts the scooter and rider against gravity.</p>
    <p>Energy per kilometre is just force × distance, so it is easy to compare: the scooter needs about <b>12 Wh per km at the wheel at 25 km/h</b>, about 19 at 40 and about 35 at 60. Drag is the reason. Double the speed and drag gets four times bigger.</p>
    <p><b>Range</b> = usable battery energy ÷ energy per km. A 2.88 kWh pack does about a hundred kilometres at 40 km/h on the flat, but far less if you ride fast, carry a pillion or climb a lot. Cold or very hot cells give a little less too.</p>
    <p>An electric drive wastes little. Of the energy from the socket, about <b>two thirds or more</b> reaches the wheel. A small petrol scooter turns only about <b>one eighth to one sixth</b> of its fuel's energy into motion; the rest leaves as heat (MotorcycleClear works it out). So the petrol scooter uses about <b>five times</b> as much energy for each kilometre, and costs several times more to run.</p>
    <p class="tip"><b>Try it:</b> change the speed and watch the drag arrow. Add a hill and a pillion. Then put in your own electricity tariff and petrol price.</p>`,
  terms: [
    { t: 'Wh per km', d: 'Watt-hours of energy used for each kilometre. A good way to compare vehicles.' },
    { t: 'Rolling resistance', d: 'The drag from tyres flexing as they roll, roughly proportional to weight.' },
    { t: 'Air drag', d: 'The push of air against you: ½ × air density × drag area × speed².' },
    { t: 'Range', d: 'How far one full charge takes you: usable energy ÷ energy per km.' },
    { t: 'Efficiency', d: 'The share of the energy put in that comes out as useful work.' },
  ],
  defaults: { speed: 40, slope: 0, pillion: false, tariff: 7, petrol: 95, chart: 'speed' },
  controls: [
    { key: 'speed', type: 'range', label: 'Steady speed', min: 10, max: 70, step: 1, fmt: (v) => Math.round(v) + ' km/h' },
    { key: 'slope', type: 'range', label: 'Road slope', min: 0, max: 8, step: 0.5, fmt: (v) => v + '%' },
    { key: 'pillion', type: 'toggle', label: 'Add a 70 kg pillion' },
    { key: 'tariff', type: 'range', label: 'Your electricity price', min: 2, max: 15, step: 0.5, fmt: (v) => '₹' + v + ' per kWh' },
    { key: 'petrol', type: 'range', label: 'Your petrol price', min: 70, max: 130, step: 1, fmt: (v) => '₹' + v + ' per litre' },
    { key: 'chart', type: 'seg', label: 'Chart', options: [{ v: 'speed', label: 'Energy vs speed' }, { v: 'chain', label: 'Where it goes' }] },
  ],
  quiz: [
    { q: 'Why does range fall so much at high speed?', options: ['The battery gets smaller', 'Air drag grows with speed squared', 'Tyres get lighter', 'The motor stops working'], answer: 1, why: 'Double the speed and drag is four times bigger, so each kilometre takes much more energy.' },
    { q: 'About how much of the socket’s energy reaches the wheel of an e-scooter?', options: ['About 10%', 'About a third', 'About two thirds or more', '100%'], answer: 2, why: 'Charger, battery, controller and motor each lose a little, typically leaving around 65–75%.' },
    { q: 'A pack holds 2.6 kWh you can use. The scooter needs 26 Wh per km. What is the range?', options: ['10 km', '100 km', '260 km', '1,000 km'], answer: 1, why: '2,600 Wh ÷ 26 Wh per km = 100 km.' },
  ],
  reel: [
    { ms: 5400, caption: 'Tyres, air and hills take the energy. Air drag grows with speed squared, so riding fast eats range.', set: { slope: 0, pillion: false, chart: 'speed' }, anim: { speed: [20, 70] }, spin: 0 },
    { ms: 5400, caption: 'From the socket, about two thirds reaches the wheel. A petrol scooter uses about five times the energy per kilometre.', set: { speed: 40, slope: 0, chart: 'chain' }, spin: 0.1 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tilt = new THREE.Group(); root.add(tilt);
    const road = box(26, 0.2, 6, M.matte(0x2b2d33, { roughness: 0.9 })); road.position.set(0, -0.1, 0); tilt.add(road);
    const dashes = []; for (let i = 0; i < 10; i++) { const d = box(1.2, 0.02, 0.18, M.matte(0xd8d8d8)); d.position.set(-13 + i * 2.8, 0.01, 1.8); tilt.add(d); dashes.push(d); }
    const sc = makeScooter(); tilt.add(sc.group);
    const rider = makeRider(); rider.position.set(0.2, 0, 0); tilt.add(rider);
    const pill = makeRider(0x8a5b6b); pill.position.set(-1.5, 0.35, 0); pill.scale.setScalar(0.93); tilt.add(pill);
    sc.parts.charger.visible = false;
    // Force arrows (lengths ∝ force; 1 unit = 40 N).
    const aDrag = arrow(hex(COL.drag), 1, 0.4, 0.08); aDrag.rotation.z = Math.PI / 2; aDrag.position.set(3.6, 4.2, 0); tilt.add(aDrag);
    const aRoll = [arrow(hex(COL.roll), 1, 0.3, 0.07), arrow(hex(COL.roll), 1, 0.3, 0.07)];
    aRoll.forEach((a, i) => { a.rotation.z = Math.PI / 2; a.position.set(i ? 2.6 : -2.6, 0.2, 0.9); tilt.add(a); });
    const aClimb = arrow(hex(COL.climb), 1, 0.4, 0.08); aClimb.rotation.z = Math.PI / 2; aClimb.position.set(-0.4, 2.0, 1.2); tilt.add(aClimb);
    const aPush = arrow(hex(COL.energy), 1, 0.4, 0.08); aPush.rotation.z = -Math.PI / 2; aPush.position.set(-2.6, 0.2, -1.0); tilt.add(aPush);
    const L = (t, pos, cls) => stage.label(t, pos, tilt, cls);
    const lDrag = L('', [5.0, 4.8, 0], 'hot'), lRoll = L('', [0, -0.5, 1.6], 'hot'), lClimb = L('', [-1.8, 2.6, 1.4], 'hot'), lPush = L('', [-4.2, -0.4, -1.0], 'hot');
    lDrag.element.style.setProperty('--c', COL.drag); lRoll.element.style.setProperty('--c', COL.roll); lClimb.element.style.setProperty('--c', COL.climb); lPush.element.style.setProperty('--c', COL.energy);

    const cur = { s: null };
    const chart = board(root, 7.4, 5.0, 740, 500, (g, w, h) => {
      panelBg(g, w, h);
      const s = cur.s; if (!s) return;
      const m = 170 + (s.pillion ? 70 : 0);
      if (s.chart === 'speed') {
        title(g, 'Energy per km, from the socket', `${m} kg, ${s.slope}% slope · coloured bands: where it goes`, 28);
        const A = axes(g, w, h, { xMin: 10, xMax: 70, yMax: 80, xTicks: [10, 20, 30, 40, 50, 60, 70], yTicks: [0, 20, 40, 60, 80], xLabel: 'speed, km/h →', yLabel: 'Wh per km', y1: 112 });
        const band = (fn, col) => { g.fillStyle = col; g.beginPath(); for (let k = 10; k <= 70; k++) { const [a] = fn(k); k === 10 ? g.moveTo(A.X(k), A.Y(a)) : g.lineTo(A.X(k), A.Y(a)); } for (let k = 70; k >= 10; k--) { const [, b] = fn(k); g.lineTo(A.X(k), A.Y(b)); } g.fill(); };
        const r = (k) => ride(k, s.slope, m);
        band((k) => { const q = r(k); return [q.roll / 3.6, 0]; }, 'rgba(255,181,71,.55)');
        band((k) => { const q = r(k); return [(q.roll + q.climb) / 3.6, q.roll / 3.6]; }, 'rgba(196,155,255,.55)');
        band((k) => { const q = r(k); return [q.wheel, (q.roll + q.climb) / 3.6]; }, 'rgba(142,240,255,.5)');
        band((k) => { const q = r(k); return [Math.min(80, q.plug), q.wheel]; }, 'rgba(255,122,61,.35)');
        const pts = []; for (let k = 10; k <= 70; k++) pts.push([k, Math.min(80, r(k).plug)]); line(g, pts, A.X, A.Y, '#fff', 4);
        const q = r(s.speed); dot(g, A.X(s.speed), A.Y(Math.min(80, q.plug)), '#5ce1a9', 12);
        text(g, 'rolling', A.x1 - 8, A.Y(q.roll / 3.6 / 2) + 8, COL.roll, 'bold 24px sans-serif', 'right');
        text(g, 'air drag', A.X(64), A.Y(r(64).wheel - 6), '#0b0d12', 'bold 24px sans-serif', 'right');
        text(g, 'losses', A.X(50), A.Y(Math.min(78, (r(50).plug + r(50).wheel) / 2)) + 8, '#ffd2b8', 'bold 24px sans-serif', 'right');
      } else {
        const q = ride(s.speed, s.slope, m), p = petrolRide(s.speed, s.slope, s.pillion ? 70 : 0);
        title(g, `Energy per km at ${Math.round(s.speed)} km/h`, 'Wh per km at each stage; green: what reaches the wheel', 28);
        const max = Math.max(p.whkm, 1), X0 = 230, X1 = w - 30;
        const ev = [['Socket', q.plug], ['After charger', q.plug * CHARGER_ETA], ['Out of battery', q.Pout / Math.max(0.5, s.speed)], ['Into motor', q.m.Pin / Math.max(0.5, s.speed)], ['At the wheel', q.wheel]];
        g.font = 'bold 22px sans-serif'; g.fillStyle = '#8ef0ff'; g.fillText('Electric scooter', 26, 124);
        ev.forEach(([lab, v], i) => hbar(g, X0, X1, 134 + i * 40, 30, v / max, i === 4 ? COL.energy : 'rgba(122,162,255,.85)', lab, `${fmt1(v)} Wh`, 20));
        g.font = 'bold 22px sans-serif'; g.fillStyle = COL.petrol; g.fillText('110 cc petrol scooter', 26, 358);
        const pe = [['Petrol burnt', p.whkm], ['Engine output', p.brake / Math.max(0.5, s.speed)], ['At the wheel', p.P / Math.max(0.5, s.speed)]];
        pe.forEach(([lab, v], i) => hbar(g, X0, X1, 368 + i * 40, 30, v / max, i === 2 ? COL.energy : 'rgba(255,154,61,.85)', lab, `${fmt1(v)} Wh`, 20));
        text(g, `Socket to wheel ${Math.round((q.wheel / q.plug) * 100)}%  ·  tank to wheel ${Math.round(p.eta * 100)}%`, 26, h - 8, '#fff', 'bold 22px sans-serif');
      }
    }, [2.0, 9.6, -2.0]);

    const frame = framer(stage, (mode) => VIEWS[mode]);
    let shift = 0, t = 0, key = '', placed = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const mode = frame();
        const lk = mode + s.mode + stage.camera.aspect.toFixed(2);
        if (lk !== placed) { placed = lk; const sp = SPOTS[mode]; screenPlace(stage, VIEWS[mode], sp[0], sp[1], chart.mesh, sp[2], 5.0); }
        const m = 170 + (s.pillion ? 70 : 0), q = ride(s.speed, s.slope, m);
        tilt.rotation.z = Math.atan(s.slope / 100);
        pill.visible = !!s.pillion;
        const v = s.speed / KMH;
        shift = (shift + v * 4 * 0.25 * dt) % 2.8;
        dashes.forEach((d, i) => { d.position.x = ((-13 + i * 2.8 - shift + 26) % 28) - 13; });
        sc.setSpin(-(t * v * 0.25) / VEH.R);
        const k = 1 / 40;
        aDrag.set(Math.max(0.05, q.drag * k)); aRoll.forEach((a) => a.set(Math.max(0.05, (q.roll / 2) * k)));
        aClimb.set(q.climb * k); aClimb.visible = q.climb > 1;
        aPush.set(Math.max(0.05, q.F * k)); aDrag.position.x = 3.6 + Math.max(0.05, q.drag * k);
        aRoll.forEach((a, i) => { a.position.x = (i ? 2.6 : -2.6) + Math.max(0.05, (q.roll / 2) * k); });
        aClimb.position.x = -0.4 + q.climb * k;
        lDrag.element.textContent = `Air drag ${fmt0(q.drag)} N`;
        lRoll.element.textContent = `Rolling ${fmt0(q.roll)} N`;
        lClimb.element.textContent = `Climbing ${fmt0(q.climb)} N`; lClimb.visible = q.climb > 1;
        lPush.element.textContent = `Motor push ${fmt0(q.F)} N`;
        sc.parts.setDisplay(s.speed, 0.7);
        const nk = JSON.stringify([s.speed, s.slope, s.pillion, s.chart]);
        if (nk !== key) { key = nk; cur.s = { ...s }; chart.redraw(); }
        fitNarrow(stage, [lPush, lRoll], -0.05);
      },
      readout: (s) => {
        const m = 170 + (s.pillion ? 70 : 0), q = ride(s.speed, s.slope, m), p = petrolRide(s.speed, s.slope, s.pillion ? 70 : 0);
        const evCost = (q.plug / 1000) * s.tariff, pCost = s.petrol / p.kmpl;
        return rows(`${fmt1(q.plug)} Wh per km`, [
          ['Range on a full charge', q.ok ? `about ${fmt0(q.range)} km` : '<span class="no">motor can’t hold this</span>'],
          ['Power at the wheel', `${fmt0(q.P)} W`],
          ['Electric: cost per km', `₹${evCost.toFixed(2)}`],
          ['Petrol scooter: cost per km', `₹${pCost.toFixed(2)} (${fmt0(p.kmpl)} km/L)`],
          ['Energy, petrol ÷ electric', `${fmt1(p.whkm / q.plug)}×`],
        ], `Steady riding, ${m} kg. ${Math.round(USABLE * 100)}% of ${PACK.kWh.toFixed(2)} kWh usable. Real trips with stops and starts use more, for both.`, 3);
      },
    };
  },
};
