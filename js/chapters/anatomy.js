// Chapter 1: take a generic electric scooter apart, and compare it with a kick scooter.
// Seated scooter: the 16S10P pack of scooter.js (57.6 V, 2.88 kWh), a rear hub motor, a controller.
// Kick scooter: a typical 36 V (10 series) pack of 18650 cells, 10S3P = 8.7 Ah, about 0.31 kWh, and
// a 250–350 W front hub motor (typical ranges for city kick scooters).
import { THREE, M, exploder, approach, clamp } from '../kit.js';
import { makeScooter, makeKick, makeRider, PACK, KMH, VEH, U, framer, fitNarrow, rows, fmt0 } from '../scooter.js';

const KICK = { V: 36, Ah: 3 * 2.9, kWh: (36 * 3 * 2.9) / 1000 };
const VIEWS = {
  seated: { wide: [[-1.2, 2.3, 0.4], [3.6, 4.0, 9.2]], narrow: [[0.2, 2.8, 0.4], [4.0, 4.6, 11]], tall: [[0.4, 2.4, 0.6], [3.6, 3.8, 7.6]] },
  kick: { wide: [[-0.6, 2.0, 0], [3.6, 3.8, 9.8]], narrow: [[0.3, 2.3, 0], [3.6, 3.8, 9.5]], tall: [[0.3, 2.2, 0], [2.4, 3.0, 4.8]] },
};

export default {
  id: 'anatomy',
  short: 'Inside an e-scooter',
  title: 'Inside an electric scooter',
  subtitle: 'A battery, a motor in the wheel, and a box of electronics that links them.',
  view: { pos: [3.6, 4.0, 9.2], target: [-1.2, 2.3, 0.4] },
  learn: `<p>An electric scooter has far fewer moving parts than a petrol one. There is no engine, no fuel tank, no gearbox, no clutch and no exhaust. Instead there are three big parts.</p>
    <p>The <b>battery pack</b> sits low under the floor. Inside are about a hundred and sixty <b>cells</b>, each a little bigger than a finger, wired together. A small circuit board, the <b>battery management system (BMS)</b>, watches every group of cells. A sealed <b>enclosure</b> keeps out water and dust.</p>
    <p>The <b>hub motor</b> is built into the rear wheel itself. The wheel's drum <i>is</i> the spinning part of the motor. The <b>controller</b>, a finned box, takes the battery's steady <b>direct current</b> and chops it into three pulsing currents for the motor's three sets of coils. Three thick wires carry them.</p>
    <p>The <b>throttle</b> on the right grip tells the controller how hard to push. Each <b>brake lever</b> has a tiny <b>cut-off switch</b>: squeeze it and the motor stops pushing at once. A <b>DC-DC converter</b> steps the pack's 50-odd volts down to 12 V for the lights and horn. The <b>charger</b> turns mains AC into DC for the cells.</p>
    <p>A <b>kick scooter</b> is the same idea, shrunk: a 36 V battery in the deck, a small hub motor in one wheel, a controller and a throttle.</p>
    <p class="tip"><b>Try it:</b> take the scooter apart, switch to see-through, then compare it with the kick scooter.</p>`,
  terms: [
    { t: 'Battery pack', d: 'Many cells wired together in a sealed box, with a circuit that watches them.' },
    { t: 'BMS', d: 'Battery management system: the board that measures every cell group and cuts the power if anything goes outside safe limits.' },
    { t: 'Hub motor', d: 'An electric motor built into a wheel, so the wheel itself is the spinning part.' },
    { t: 'Controller', d: 'The electronics that turn battery DC into three-phase current for the motor, as much as the throttle asks.' },
    { t: 'DC-DC converter', d: 'A circuit that turns the pack’s high voltage into 12 V for lights, horn and display.' },
    { t: 'Brake cut-off', d: 'A switch in each brake lever that tells the controller to stop driving the motor.' },
  ],
  defaults: { which: 'seated', explode: 0, xray: false, speed: 30 },
  controls: [
    { key: 'which', type: 'seg', label: 'Look at', options: [{ v: 'seated', label: 'Seated e-scooter' }, { v: 'kick', label: 'Kick scooter' }] },
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'See-through body' },
    { key: 'speed', type: 'range', label: 'Riding speed', min: 0, max: 60, step: 1, fmt: (v) => Math.round(v) + ' km/h' },
  ],
  quiz: [
    { q: 'Where is the motor on most Indian family e-scooters with a hub motor?', options: ['Under the seat, driving a chain', 'Inside the rear wheel', 'Behind the headlight', 'In the battery'], answer: 1, why: 'A hub motor is built into the wheel: the wheel’s drum is the rotor, with magnets inside it.' },
    { q: 'What does the controller do?', options: ['Charges the battery from the mains', 'Turns battery DC into three-phase current for the motor, as much as the throttle asks', 'Measures the tyre pressure', 'Cools the motor'], answer: 1, why: 'The controller is the link between the steady DC of the battery and the motor’s three coil sets.' },
    { q: 'Why does each brake lever have a small switch?', options: ['To turn on the horn', 'To make the brake light flash only', 'To tell the controller to stop driving the motor while you brake', 'To charge the battery'], answer: 2, why: 'The cut-off makes sure the motor never pushes against the brakes.' },
  ],
  reel: [
    { ms: 5600, caption: 'An electric scooter has no engine, no fuel tank and no gearbox: just a battery, a motor and a controller.', set: { which: 'seated', xray: true, speed: 20 }, anim: { explode: [0, 1] }, spin: 0.5 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const sc = makeScooter(); root.add(sc.group);
    const rider = makeRider(); rider.position.set(0.2, 0, 0); rider.scale.setScalar(0.95); sc.group.add(rider); rider.visible = false;
    const kick = makeKick(); kick.group.position.set(0, 0, 0); root.add(kick.group);
    const P = sc.parts, K = kick.parts;

    const setExplode = exploder([
      { obj: P.pack, off: [0, -0.0, 3.2] },
      { obj: P.panels, off: [0, 1.1, -2.6] },
      { obj: P.seat, off: [0, 1.6, 0] },
      { obj: P.controller, off: [0, 1.0, 2.3] },
      { obj: P.wheels.rear.group, off: [-0.6, 0, -2.6] },
      { obj: P.arm, off: [-0.3, 0, -1.8] },
      { obj: P.shock, off: [-0.3, 0.4, -1.8] },
      { obj: P.dcdc, off: [0.8, 0.6, -1.8] },
      { obj: P.front, off: [0.9, 0.5, 0] },
      { obj: P.wheels.front.group, off: [1.6, 0, 0] },
      { obj: P.charger, off: [0, 0, 1.0] },
      { obj: P.phase, off: [0, 0.3, 0.6] },
    ]);
    const bmsHome = P.bms.position.clone();
    const kickExplode = exploder([
      { obj: K.pack, off: [0, -0.2, 2.2] },
      { obj: K.controller, off: [0.3, 0.2, 2.2] },
      { obj: K.stem, off: [0.6, 0.6, 0] },
      { obj: K.wheels.front.group, off: [1.6, 0, -1.4] },
      { obj: K.wheels.rear.group, off: [-1.0, 0, 0] },
    ]);

    const L = (t, parent, pos, cls) => stage.label(t, pos, parent, cls);
    const lab = {
      pack: L('Battery pack: 160 cells', P.pack, [0.0, -0.5, 0.7], 'hot'),
      bms: L('BMS board', P.bms, [0, 0.35, 0]),
      enc: L('Sealed enclosure', P.pack, [-1.1, 0.2, 0.6]),
      motor: L('Hub motor in the wheel', P.wheels.rear.group, [-0.9, 1.0, 0.8], 'hot'),
      ctrl: L('Controller', P.controller, [0, 0.45, 0.2], 'hot'),
      throttle: L('Throttle (right grip)', P.bar, [0, 0.35, 1.2]),
      levers: L('Brake levers + cut-off switches', P.bar, [0.1, -0.45, -0.9]),
      display: L('Display', P.bar, [-0.2, 0.75, 0]),
      dcdc: L('DC-DC converter: 12 V', P.dcdc, [0.2, 0.3, -0.3]),
      charger: L('Charger', P.charger, [0, 0.5, 0.3]),
      frame: L('Steel frame', P.frame, [-0.1, 1.15, -0.4]),
      susp: L('Fork and shock absorber', P.front, [2.1, 1.7, -0.5]),
      tyre: L('Tubeless tyres, 12-inch rims', P.wheels.front.group, [0.4, -1.15, 0]),
    };
    const inner = [lab.bms, lab.enc, lab.dcdc, lab.frame, lab.display];
    const minor = [lab.tyre, lab.susp, lab.levers, lab.charger];
    const klab = {
      pack: L('36 V battery in the deck', K.pack, [0, -0.45, 0.6], 'hot'),
      motor: L('Hub motor (front)', K.wheels.front.group, [0, 0.85, 0], 'hot'),
      ctrl: L('Controller', K.controller, [0, 0.35, 0.3]),
      stem: L('Folding stem, throttle, brake lever', K.stem, [1.4, 4.0, 0]),
      brake: L('Rear disc brake', K.wheels.rear.group, [0, 0.9, 0]),
    };

    const frame = framer(stage, (mode, key) => { const [t, p] = VIEWS[key][mode]; return { pos: p, target: t }; });
    let spin = 0, v = 0, lastWhich = null;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const seated = s.which === 'seated';
        frame(s.which);
        sc.group.visible = seated; kick.group.visible = !seated;
        Object.values(lab).forEach((l) => { l.visible = seated; });
        Object.values(klab).forEach((l) => { l.visible = !seated; });
        if (lastWhich !== s.which) { lastWhich = s.which; }
        setExplode(seated ? s.explode : 0); kickExplode(seated ? 0 : s.explode);
        P.bms.position.copy(bmsHome).add(new THREE.Vector3(0, 1.1 * s.explode, 0));
        const see = s.xray || s.explode > 0.05;
        P.bodyMat.opacity = see ? 0.18 : 1; P.bodyMat.depthWrite = !see;
        K.deckMat.opacity = see ? 0.2 : 1; K.deckMat.depthWrite = !see;
        P.enclosure.material.opacity = see ? 0.22 : 0.85;
        inner.forEach((l) => { l.visible = seated && s.explode > 0.3; });
        v = approach(v, s.speed, 2, dt);
        const R = seated ? VEH.R : 0.127;
        spin -= ((v / KMH) / R) * dt * 0.25;                          // shown a quarter of real speed
        sc.setSpin(spin); kick.setSpin(spin);
        P.throttleMark.rotation.x = -clamp(v / 60, 0, 1) * 0.6;
        P.setDisplay(v, 0.78);
        fitNarrow(stage, seated ? minor : []);
      },
      readout: (s) => {
        if (s.which === 'kick') return rows('Kick scooter', [
          ['Battery', `${KICK.V} V × ${KICK.Ah.toFixed(1)} Ah ≈ ${KICK.kWh.toFixed(2)} kWh`],
          ['Cells', '30 (10 in series × 3 in parallel)'],
          ['Motor', 'about 250–350 W, in the front wheel'],
          ['Wheel', '10-inch tyre, about 25 cm across'],
        ], 'Typical city kick-scooter figures. Many cities cap them at 20–25 km/h.');
        const w = (s.speed / KMH) / VEH.R, rpm = (w * 60) / (2 * Math.PI);
        return rows(`${PACK.kWh.toFixed(2)} kWh on board`, [
          ['Battery', `${PACK.V.toFixed(1)} V × ${PACK.Ah} Ah`],
          ['Cells', `${PACK.n} (${PACK.nS} in series × ${PACK.nP} in parallel)`],
          ['Cells weigh', `about ${fmt0(PACK.kg)} kg`],
          ['Wheel speed', `${fmt0(rpm)} rpm at ${Math.round(s.speed)} km/h`],
        ], 'A generic family e-scooter: 100 kg, 12-inch wheels, a rear hub motor. Same energy as about a third of a litre of petrol.');
      },
    };
  },
};
