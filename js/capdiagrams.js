/* =========================================================================
   STRATIS - capability diagrams (3D, interactive)
   Three small research-paper-style scenes for the "what STRATIS does" rows,
   in the same visual language as molecule.js / flywheel.js: greyscale atoms
   (translucent outer + bright core), faint wireframe edges, a turquoise
   #57FFEB signal, OrbitControls drag, IntersectionObserver pause, and a
   reduced-motion static fallback.

     join     -> separate sources converging into one connected substrate
     reason   -> dimensions reasoned inward to a recommendation, continuously
     compound -> a self-reinforcing flywheel that grows the model with use
   ========================================================================= */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SIGNAL = new THREE.Color(0x57ffeb);
const EDGE_BASE = new THREE.Color(0x9aa1a9);
const GREYS = ["#2E343B", "#454C56", "#5A626B", "#727A83", "#8A9099"];
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (e0, e1, x) => clamp01((x - e0) / (e1 - e0));
const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);

// even directions on a (slightly squished) sphere - matches the house style
function fib(n, radius) {
  const pts = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1 || 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), t = ga * i;
    pts.push([radius * r * Math.cos(t), radius * y * 0.72, radius * r * Math.sin(t)]);
  }
  return pts;
}
const dist2 = (a, b) => { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; };

function atom(greyHex, rad) {
  const col = new THREE.Color(greyHex);
  const g = new THREE.Group();
  const outerMat = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.4, emissive: col, emissiveIntensity: 0.18, roughness: 0.5, metalness: 0.05, depthWrite: false });
  const coreMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.28, roughness: 0.3, metalness: 0.1 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 20), outerMat));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(rad * 0.34, 14, 14), coreMat));
  return { g, outerMat, coreMat, grey: col.clone(), rad };
}
function tint(a, t) {
  const c = a.grey.clone().lerp(SIGNAL, t);
  a.coreMat.color.copy(c); a.coreMat.emissive.copy(c); a.coreMat.emissiveIntensity = 0.28 + t * 1.05;
  a.outerMat.color.copy(c); a.outerMat.emissive.copy(c); a.outerMat.emissiveIntensity = 0.18 + t * 0.5;
  a.g.scale.setScalar(1 + t * 0.4);
}

// dynamic line set with per-edge turquoise tint
function edges(pairs, posOf) {
  const pos = new Float32Array(pairs.length * 6), col = new Float32Array(pairs.length * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  pairs.forEach((e, i) => { const a = posOf(e[0]), b = posOf(e[1]); pos.set([a[0], a[1], a[2], b[0], b[1], b[2]], i * 6); });
  const mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false }));
  const _c = new THREE.Color();
  function setLit(arr) {
    for (let i = 0; i < pairs.length; i++) {
      _c.copy(EDGE_BASE).lerp(SIGNAL, arr ? arr[i] : 0);
      col[i * 6] = _c.r; col[i * 6 + 1] = _c.g; col[i * 6 + 2] = _c.b;
      col[i * 6 + 3] = _c.r; col[i * 6 + 4] = _c.g; col[i * 6 + 5] = _c.b;
    }
    geo.attributes.color.needsUpdate = true;
  }
  setLit(null);
  return { mesh, setLit, n: pairs.length };
}

function comet(rad) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 14), new THREE.MeshStandardMaterial({ color: SIGNAL, emissive: SIGNAL, emissiveIntensity: 1.1, transparent: true, opacity: 0, roughness: 0.3 }));
  m.visible = false; return m;
}

function core(canvas, camZ, fov, opts) {
  opts = opts || {};
  const wrap = canvas.parentElement;
  const scene = new THREE.Scene();
  const root = new THREE.Group(); scene.add(root);
  const camera = new THREE.PerspectiveCamera(fov || 50, 1, 0.1, 400);
  camera.position.set(0, 0, camZ);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const key = new THREE.PointLight(0xffffff, 0.8); key.position.set(24, 30, 26); scene.add(key);
  const fill = new THREE.PointLight(0xffffff, 0.3); fill.position.set(-22, -16, 18); scene.add(fill);
  let labelRenderer = null;
  if (opts.labels) {
    labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    wrap.appendChild(labelRenderer.domElement);
  }
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true;
  controls.dampingFactor = 0.06; controls.rotateSpeed = 0.45;
  controls.autoRotate = (opts.autoRotate !== false) && !reduce; controls.autoRotateSpeed = 0.55;
  if (opts.polar) { controls.minPolarAngle = opts.polar[0]; controls.maxPolarAngle = opts.polar[1]; }
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); if (labelRenderer) labelRenderer.setSize(w, h);
    const aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix();
    // pull back on narrow/portrait panels so the diagram fits horizontally
    const half = THREE.MathUtils.degToRad(camera.fov) / 2;
    const want = camZ * Math.max(1, Math.tan(half) / Math.tan(Math.atan(Math.tan(half) * aspect)));
    const dir = camera.position.clone().sub(controls.target);
    const len = dir.length() || 1;
    camera.position.copy(controls.target).add(dir.multiplyScalar(want / len));
    controls.update();
  }
  resize(); new ResizeObserver(resize).observe(wrap);
  const wide = (wrap.clientWidth || 999) >= 460;   // skip dense labels on narrow (mobile) panels
  return { canvas, wrap, scene, root, camera, renderer, labelRenderer, controls, resize, wide };
}

function label(ctx, text, pos, px, op) {
  const div = document.createElement("div");
  div.className = "mol-label"; div.textContent = text;
  div.style.fontSize = (px || 10) + "px"; div.style.opacity = op == null ? 0.7 : op;
  div.style.fontWeight = "600"; div.style.letterSpacing = "0.04em";
  const o = new CSS2DObject(div); o.position.set(pos[0], pos[1], pos[2]); ctx.root.add(o);
  return div;
}

function run(ctx, update) {
  const clock = new THREE.Clock();
  let elapsed = 0, raf = null;
  function render() { ctx.renderer.render(ctx.scene, ctx.camera); if (ctx.labelRenderer) ctx.labelRenderer.render(ctx.scene, ctx.camera); }
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    if (!reduce) update(dt, elapsed);
    ctx.controls.update();
    render();
    raf = requestAnimationFrame(frame);
  }
  if (reduce) { update(0.0001, 5.5); ctx.controls.update(); render(); }
  else frame();
  new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { if (!raf && !reduce) { clock.start(); frame(); } }
    else if (raf) { cancelAnimationFrame(raf); raf = null; }
  }), { threshold: 0 }).observe(ctx.canvas);
}

/* ---------- JOIN: sources converging into one substrate ---------- */
function buildJoin(canvas) {
  const ctx = core(canvas, 66, 50);
  ctx.root.rotation.x = 0.12;
  const atoms = [];
  const add = (pos, grey, rad, meta) => { const a = atom(grey, rad); a.g.position.set(pos[0], pos[1], pos[2]); a.pos = pos; Object.assign(a, meta); ctx.root.add(a.g); atoms.push(a); return atoms.length - 1; };

  // central substrate lattice
  const hub = fib(7, 5).map((p) => add(p, GREYS[1], 1.05, { kind: "hub" }));
  // source clusters around it
  const NS = 6, clusters = [];
  fib(NS, 1).forEach((d, ci) => {
    const C = [d[0] * 23, d[1] * 23, d[2] * 23];
    const off = fib(4, 4);
    const ids = off.map((o, k) => add([C[0] + o[0], C[1] + o[1], C[2] + o[2]], GREYS[k === 0 ? 2 : 3], k === 0 ? 1.15 : 0.7, { kind: "src", ci, lead: k === 0 }));
    clusters.push({ ids, lead: ids[0] });
  });

  // edges: hub mesh + intra-cluster + join (lead -> nearest hub)
  const pairs = [], joinOf = [];
  hub.forEach((i) => { hub.map((j) => ({ j, d: dist2(atoms[i].pos, atoms[j].pos) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2).forEach((o) => { if (i < o.j) pairs.push([i, o.j]); }); });
  const hubEdgeEnd = pairs.length;
  clusters.forEach((cl) => { cl.ids.slice(1).forEach((id) => pairs.push([cl.lead, id])); });
  clusters.forEach((cl, ci) => {
    const near = hub.reduce((b, j) => (dist2(atoms[j].pos, atoms[cl.lead].pos) < dist2(atoms[b].pos, atoms[cl.lead].pos) ? j : b), hub[0]);
    joinOf[ci] = { edge: pairs.length, hub: near }; pairs.push([cl.lead, near]);
  });
  const E = edges(pairs, (i) => atoms[i].pos); ctx.root.add(E.mesh);
  const comets = clusters.map(() => { const m = comet(1.2); ctx.root.add(m); return m; });
  const nodeLit = new Float32Array(atoms.length), edgeLit = new Float32Array(pairs.length);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3();

  const STAG = 0.5, DUR = 1.55, HOLD = 1.1, FADE = 1.0;
  const ARRIVE = STAG * (NS - 1) + DUR, CYCLE = ARRIVE + HOLD + FADE;

  return run(ctx, (dt, el) => {
    const t = el % CYCLE;
    nodeLit.fill(0); edgeLit.fill(0);
    const pulse = t > ARRIVE ? bump(t, ARRIVE + HOLD * 0.5, HOLD * 0.7) * (1 - smooth(ARRIVE + HOLD, CYCLE, t)) : 0;
    clusters.forEach((cl, ci) => {
      const jo = joinOf[ci], ws = ci * STAG, prog = clamp01((t - ws) / DUR);
      const c = comets[ci];
      if (prog > 0 && prog < 1) {
        _a.fromArray(atoms[cl.lead].pos); _b.fromArray(atoms[jo.hub].pos); _t.lerpVectors(_a, _b, prog);
        c.position.copy(_t); c.visible = true; c.material.opacity = 0.9; c.scale.setScalar(0.8 + 0.4 * Math.sin(prog * Math.PI));
        edgeLit[jo.edge] = prog; nodeLit[cl.lead] = Math.max(nodeLit[cl.lead], 0.85);
      } else { c.visible = false; }
      const arrived = t >= ws + DUR ? (1 - smooth(ARRIVE + HOLD, CYCLE, t)) : 0;
      nodeLit[jo.hub] = Math.max(nodeLit[jo.hub], arrived);
      edgeLit[jo.edge] = Math.max(edgeLit[jo.edge], arrived * 0.6);
    });
    for (let i = 0; i < hub.length; i++) nodeLit[hub[i]] = Math.max(nodeLit[hub[i]], pulse);
    for (let i = 0; i < hubEdgeEnd; i++) edgeLit[i] = Math.max(edgeLit[i], pulse * 0.9);
    for (let i = 0; i < atoms.length; i++) tint(atoms[i], nodeLit[i]);
    E.setLit(edgeLit);
  });
}

/* ---------- REASON: dimensions reasoned inward to a recommendation ---------- */
function buildReason(canvas) {
  const ctx = core(canvas, 60, 50);
  ctx.root.rotation.x = 0.1;
  const atoms = [];
  const c0 = atom(GREYS[0], 2.3); ctx.root.add(c0.g); atoms.push(c0); // decision core
  const RADII = [8, 14, 20], arms = [];
  fib(6, 1).forEach((d) => {
    const ids = RADII.map((r, k) => { const a = atom(GREYS[k === 2 ? 3 : 2], 0.95 - k * 0.12); a.pos = [d[0] * r, d[1] * r, d[2] * r]; a.r = r; a.g.position.set(a.pos[0], a.pos[1], a.pos[2]); ctx.root.add(a.g); atoms.push(a); return atoms.length - 1; });
    arms.push(ids);
  });
  // edges: along each arm (core->r1->r2->r3) + faint outer lattice ring
  const pairs = [];
  arms.forEach((ids) => { pairs.push([0, ids[0]]); pairs.push([ids[0], ids[1]]); pairs.push([ids[1], ids[2]]); });
  for (let i = 0; i < arms.length; i++) { const a = arms[i][2], b = arms[(i + 1) % arms.length][2]; pairs.push([a, b]); }
  const E = edges(pairs, (i) => (i === 0 ? [0, 0, 0] : atoms[i].pos)); ctx.root.add(E.mesh);
  // recommendation pulse - expanding turquoise wireframe sphere
  const ring = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: SIGNAL, wireframe: true, transparent: true, opacity: 0 }));
  ctx.root.add(ring);
  const nodeLit = new Float32Array(atoms.length), edgeLit = new Float32Array(pairs.length);
  const CYCLE = 3.2, IN = 0.58;

  return run(ctx, (dt, el) => {
    const p = (el % CYCLE) / CYCLE;
    nodeLit.fill(0); edgeLit.fill(0);
    if (p < IN) {                                   // contracting wavefront across dimensions
      const shell = 22 * (1 - p / IN);
      arms.forEach((ids) => ids.forEach((id, k) => {
        const lit = bump(atoms[id].r, shell, 5);
        nodeLit[id] = Math.max(nodeLit[id], lit);
      }));
      arms.forEach((ids) => {
        edgeLit[pairs.findIndex((e) => e[0] === ids[1] && e[1] === ids[2])] = bump(17, shell, 6);
        edgeLit[pairs.findIndex((e) => e[0] === ids[0] && e[1] === ids[1])] = bump(11, shell, 6);
        edgeLit[pairs.findIndex((e) => e[0] === 0 && e[1] === ids[0])] = bump(4, shell, 6);
      });
    }
    const coreLit = bump(p, IN, 0.16);              // core fires = recommendation formed
    nodeLit[0] = clamp01(coreLit + (p < IN ? smooth(IN - 0.18, IN, p) * 0.6 : (1 - smooth(IN, 1, p))));
    if (p >= IN) {                                  // recommendation broadcasts outward
      const o = (p - IN) / (1 - IN);
      ring.scale.setScalar(1 + o * 22); ring.material.opacity = 0.5 * (1 - o);
    } else ring.material.opacity = 0;
    for (let i = 0; i < atoms.length; i++) tint(atoms[i], nodeLit[i]);
    E.setLit(edgeLit);
  });
}

/* ---------- COMPOUND: the flywheel that grows the model with use ---------- */
function buildCompound(canvas) {
  const ctx = core(canvas, 50, 50);
  ctx.root.rotation.x = 0.5;                        // look down slightly on the loop
  const rnd = (() => { let s = 7; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
  const atoms = [];
  // central model mass
  const mass = [];
  for (let i = 0; i < 15; i++) {
    const p = fib(15, 1)[i], r = 2 + rnd() * 4;
    const a = atom(GREYS[1 + (i % 3)], 0.7 + rnd() * 0.7);
    a.pos = [p[0] * r, p[1] * r, p[2] * r * 0.9]; a.g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    a.base = 0; ctx.root.add(a.g); mass.push(atoms.push(a) - 1);
  }
  // mass internal edges (k-nearest)
  const mp = [];
  mass.forEach((i) => mass.map((j) => ({ j, d: dist2(atoms[i].pos, atoms[j].pos) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2).forEach((o) => { if (i < o.j) mp.push([i, o.j]); }));
  const E = edges(mp, (i) => atoms[i].pos); ctx.root.add(E.mesh);
  // orbit ring (recommendation -> action -> outcome -> learn -> back in)
  const RX = 16, RZ = 11, SEG = 96, orbit = [];
  const op = new Float32Array((SEG + 1) * 3);
  for (let i = 0; i <= SEG; i++) { const a = (i / SEG) * Math.PI * 2; op[i * 3] = Math.cos(a) * RX; op[i * 3 + 1] = Math.sin(a * 2) * 0.6; op[i * 3 + 2] = Math.sin(a) * RZ; }
  const og = new THREE.BufferGeometry(); og.setAttribute("position", new THREE.BufferAttribute(op, 3));
  ctx.root.add(new THREE.Line(og, new THREE.LineBasicMaterial({ color: EDGE_BASE, transparent: true, opacity: 0.4 })));
  const orbAt = (u) => { const a = u * Math.PI * 2; return [Math.cos(a) * RX, Math.sin(a * 2) * 0.6, Math.sin(a) * RZ]; };
  // 4 stations on the orbit
  for (let k = 0; k < 4; k++) { const p = orbAt(k / 4); const a = atom(GREYS[2], 0.8); a.g.position.set(p[0], p[1], p[2]); ctx.root.add(a.g); orbit.push(atoms.push(a) - 1); }
  const head = comet(1.4); ctx.root.add(head); head.visible = true;
  const feed = []; for (let i = 0; i < 8; i++) { const m = comet(0.7); ctx.root.add(m); feed.push({ m, active: false, p: 0, to: 0 }); }
  let fc = 0, growth = 0, u = 0, lastLoop = 0;
  const nodeLit = new Float32Array(atoms.length);
  const SPEED = 0.16;

  return run(ctx, (dt, el) => {
    nodeLit.fill(0);
    u = (u + SPEED * dt) % 1;
    if (u < lastLoop) { growth = Math.min(1, growth + 0.16); }  // each full loop compounds the model
    lastLoop = u;
    growth = Math.max(0, growth - dt * 0.03);                   // gentle breathing decay
    const hp = orbAt(u); head.position.set(hp[0], hp[1], hp[2]); head.material.opacity = 0.95;
    head.scale.setScalar(0.9 + 0.2 * Math.sin(el * 4));
    orbit.forEach((id, k) => { nodeLit[id] = Math.max(nodeLit[id], bump(u, k / 4, 0.08) + (Math.abs(u - k / 4) < 0.5 / 4 ? 0 : 0)); });
    // emit a feed particle from the "outcome" station back into the mass, each loop
    const out = 0.5;
    if (u > out && u - SPEED * dt <= out) { const f = feed[fc]; fc = (fc + 1) % feed.length; f.active = true; f.p = 0; f.to = mass[Math.floor(rnd() * mass.length)]; f.from = orbAt(out); }
    feed.forEach((f) => {
      if (!f.active) { f.m.visible = false; return; }
      f.p += dt / 1.1; if (f.p >= 1) { f.active = false; f.m.visible = false; nodeLit[f.to] = 1; return; }
      const tgt = atoms[f.to].pos, t = f.p; f.m.visible = true;
      f.m.position.set(f.from[0] + (tgt[0] - f.from[0]) * t, f.from[1] + (tgt[1] - f.from[1]) * t, f.from[2] + (tgt[2] - f.from[2]) * t);
      f.m.material.opacity = 0.9 * (1 - t * 0.3); nodeLit[f.to] = Math.max(nodeLit[f.to], t);
    });
    // model glow + subtle growth in scale as it compounds
    for (let k = 0; k < mass.length; k++) { const id = mass[k]; const t = Math.max(nodeLit[id], growth * 0.5); tint(atoms[id], t); atoms[id].g.scale.multiplyScalar(1); }
    for (const id of orbit) tint(atoms[id], nodeLit[id]);
    E.setLit(mp.map((e, i) => Math.max(nodeLit[e[0]], nodeLit[e[1]]) * 0.6 + growth * 0.25));
  });
}


/* ---------- INSTANCES: an isolated molecular instance per client, layered into one interface ---------- */
function buildInstances(canvas) {
  const ctx = core(canvas, 47, 50, { autoRotate: false, labels: true, polar: [Math.PI * 0.5 - 0.42, Math.PI * 0.5 + 0.26] });
  ctx.root.rotation.x = 0.06;
  const atoms = [];
  const add = (pos, grey, rad, meta) => { const a = atom(grey, rad); a.pos = pos; a.g.position.set(pos[0], pos[1], pos[2]); Object.assign(a, meta || {}); ctx.root.add(a.g); return atoms.push(a) - 1; };

  const IFN = 5, iface = [];
  for (let i = 0; i < IFN; i++) iface.push(add([-12 + (24 / (IFN - 1)) * i, 14, 0], GREYS[1], 1.0));
  label(ctx, "Agency interface", [0, 18.4, 0], 11, 0.82);

  // each client = a small molecular data sphere (its own STRATIS instance)
  const centers = [[-17, -8, 0], [0, -8, 0], [17, -8, 0]], names = ["Client A", "Client B", "Client C"], SR = 5.0;
  const instances = [];
  centers.forEach((C, ci) => {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(SR, 18, 12), new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.07, color: 0x2A2E36, depthWrite: false }));
    shell.position.set(C[0], C[1], C[2]); ctx.root.add(shell);
    const ids = [add([C[0], C[1], C[2]], GREYS[0], 1.0, { ci })];
    fib(11, SR * 0.82).forEach((d, j) => ids.push(add([C[0] + d[0], C[1] + d[1], C[2] + d[2]], GREYS[2 + (j % 2)], 0.6, { ci })));
    let lead = ids[0]; ids.forEach((id) => { if (atoms[id].pos[1] > atoms[lead].pos[1]) lead = id; });
    const ifaceNode = iface.reduce((b, j) => (Math.abs(atoms[j].pos[0] - C[0]) < Math.abs(atoms[b].pos[0] - C[0]) ? j : b), iface[0]);
    instances.push({ ids, lead, ifaceNode, cycle: 3.4 + ci * 0.8, off: ci * 1.3 });
    label(ctx, names[ci], [C[0], C[1] - (SR + 2.2), 0], 10, 0.62);
  });

  const pairs = [];
  for (let i = 0; i < IFN - 1; i++) pairs.push([iface[i], iface[i + 1]]);
  const ifaceEnd = pairs.length;
  instances.forEach((inst) => inst.ids.forEach((i) => inst.ids.map((j) => ({ j, d: dist2(atoms[i].pos, atoms[j].pos) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2).forEach((o) => { if (i < o.j) pairs.push([i, o.j]); })));
  const internalEnd = pairs.length;
  instances.forEach((inst) => { inst.uplink = pairs.length; pairs.push([inst.lead, inst.ifaceNode]); });
  const E = edges(pairs, (i) => atoms[i].pos); ctx.root.add(E.mesh);
  const comets = instances.map(() => { const m = comet(1.0); ctx.root.add(m); return m; });
  const nodeLit = new Float32Array(atoms.length), edgeLit = new Float32Array(pairs.length);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3();

  return run(ctx, (dt, el) => {
    nodeLit.fill(0); edgeLit.fill(0);
    instances.forEach((inst, ci) => {
      const t = (el + inst.off) % inst.cycle;
      const think = t < 1.3 ? Math.sin(Math.PI * clamp01(t / 1.3)) : 0;
      inst.ids.forEach((id, k) => { nodeLit[id] = Math.max(nodeLit[id], think * (0.4 + 0.6 * Math.abs(Math.sin(el * 2.5 + k * 0.8 + ci)))); });
      const up0 = 1.3, up1 = 2.3, c = comets[ci];
      if (t > up0 && t < up1) {
        const prog = clamp01((t - up0) / (up1 - up0));
        _a.fromArray(atoms[inst.lead].pos); _b.fromArray(atoms[inst.ifaceNode].pos); _t.lerpVectors(_a, _b, prog);
        c.position.copy(_t); c.visible = true; c.material.opacity = 0.9; c.scale.setScalar(0.8 + 0.4 * Math.sin(prog * Math.PI));
        edgeLit[inst.uplink] = prog; nodeLit[inst.lead] = Math.max(nodeLit[inst.lead], 0.85);
      } else c.visible = false;
      const reported = t >= up1 ? (1 - clamp01((t - up1) / (inst.cycle - up1))) : 0;
      nodeLit[inst.ifaceNode] = Math.max(nodeLit[inst.ifaceNode], reported);
    });
    for (let i = 0; i < ifaceEnd; i++) { const e = pairs[i]; edgeLit[i] = Math.max(edgeLit[i], Math.min(nodeLit[e[0]], nodeLit[e[1]]) * 0.8); }
    for (let i = ifaceEnd; i < internalEnd; i++) { const e = pairs[i]; edgeLit[i] = Math.max(edgeLit[i], Math.max(nodeLit[e[0]], nodeLit[e[1]]) * 0.5); }
    for (let i = 0; i < atoms.length; i++) tint(atoms[i], nodeLit[i]);
    E.setLit(edgeLit);
  });
}

/* ---------- WORKFLOW: data signals -> always-on monitoring -> insight -> human-in-loop -> clients ---------- */
function buildWorkflow(canvas) {
  const ctx = core(canvas, 54, 50, { autoRotate: false, labels: true, polar: [Math.PI * 0.5 - 0.3, Math.PI * 0.5 + 0.18] });
  ctx.root.rotation.x = 0.04;
  const atoms = [];
  const add = (pos, grey, rad) => { const a = atom(grey, rad); a.pos = pos; a.g.position.set(pos[0], pos[1], pos[2]); ctx.root.add(a.g); return atoms.push(a) - 1; };
  const inY = [18, 10.8, 3.6, -3.6, -10.8, -18];
  const inputs = inY.map((y) => add([-31, y, 0], GREYS[2], 0.8));
  const coreN = add([-15, 0, 0], GREYS[0], 2.6);
  const insight = add([-3, 0, 0], GREYS[1], 1.5);
  const approval = add([7, 6, 0], GREYS[2], 1.0);
  const feedback = add([7, -6, 0], GREYS[2], 1.0);
  const bus = add([15, 0, 0], GREYS[2], 0.7);
  const clientsY = [12, 0, -12], clients = clientsY.map((y) => add([26, y, 0], GREYS[1], 1.1));
  // headers + labels (full set on wide panels; on narrow/mobile keep only the two anchors so they don't overlap)
  if (ctx.wide) {
    label(ctx, "Data signal", [-31, 23.5, 0], 8.5, 0.5);
    label(ctx, "Intelligence", [-9, 23.5, 0], 8.5, 0.5);
    label(ctx, "Human in the loop", [7, 23.5, 0], 8.5, 0.5);
    label(ctx, "Clients", [26, 23.5, 0], 8.5, 0.5);
    label(ctx, "Always-on monitoring", [-15, 4.6, 0], 9, 0.82);
    label(ctx, "Real-time insight", [-3, 3.6, 0], 8.5, 0.7);
    label(ctx, "Approval", [7, 9, 0], 8.5, 0.7);
    label(ctx, "Feedback", [7, -9.4, 0], 8.5, 0.7);
    ["Client A", "Client B", "Client C"].forEach((nm, k) => label(ctx, nm, [26, clientsY[k] + (k === 2 ? -3 : 3), 0], 9, 0.72));
  } else {
    label(ctx, "Always-on monitoring", [-15, 5.4, 0], 8.5, 0.82);
    label(ctx, "Clients", [26, 16, 0], 8.5, 0.7);
  }
  const pairs = [];
  inputs.forEach((i) => pairs.push([i, coreN]));
  pairs.push([coreN, insight], [insight, approval], [insight, feedback], [approval, bus], [feedback, bus]);
  clients.forEach((c) => pairs.push([bus, c]));
  const E = edges(pairs, (i) => atoms[i].pos); ctx.root.add(E.mesh);
  const head = comet(1.3); ctx.root.add(head);
  const spine = [coreN, insight, bus, clients[1]];
  const nodeLit = new Float32Array(atoms.length), edgeLit = new Float32Array(pairs.length);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3();
  const X0 = -33, X1 = 27, CYCLE = 4.0;
  return run(ctx, (dt, el) => {
    nodeLit.fill(0); edgeLit.fill(0);
    const sweep = (el % CYCLE) / CYCLE, wx = X0 + (X1 - X0) * Math.min(1, sweep / 0.82);
    for (let i = 0; i < atoms.length; i++) nodeLit[i] = bump(atoms[i].pos[0], wx, 7);
    for (let i = 0; i < pairs.length; i++) { const e = pairs[i]; edgeLit[i] = bump((atoms[e[0]].pos[0] + atoms[e[1]].pos[0]) / 2, wx, 7); }
    if (sweep > 0.8) { const h = 1 - smooth(0.82, 1, sweep); clients.forEach((c) => nodeLit[c] = Math.max(nodeLit[c], h)); }
    const su = clamp01(sweep / 0.82) * (spine.length - 1), seg = Math.min(spine.length - 2, Math.floor(su)), f = su - seg;
    _a.fromArray(atoms[spine[seg]].pos); _b.fromArray(atoms[spine[seg + 1]].pos); _t.lerpVectors(_a, _b, f);
    head.position.copy(_t); head.visible = sweep < 0.95; head.material.opacity = 0.9; head.scale.setScalar(0.9 + 0.2 * Math.sin(el * 4));
    for (let i = 0; i < atoms.length; i++) tint(atoms[i], nodeLit[i]);
    E.setLit(edgeLit);
  });
}

/* ---------- CYCLE: node/wireframe loop; the center cluster grows each completed cycle ---------- */
function buildCycle(canvas) {
  const ctx = core(canvas, 46, 50, { autoRotate: false, labels: true, polar: [Math.PI * 0.5 - 0.55, Math.PI * 0.5 + 0.32] });
  ctx.root.rotation.x = 0.42;
  const rnd = (() => { let s = 11; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
  const RN = 24, R = 14, ringAtoms = [];
  for (let i = 0; i < RN; i++) { const a0 = (i / RN) * Math.PI * 2; const a = atom(GREYS[2], 0.6); a.ang = a0; a.pos = [Math.cos(a0) * R, Math.sin(a0) * R, 0]; a.g.position.set(a.pos[0], a.pos[1], a.pos[2]); ctx.root.add(a.g); ringAtoms.push(a); }
  const rp = []; for (let i = 0; i < RN; i++) rp.push([i, (i + 1) % RN]);
  const RE = edges(rp, (i) => ringAtoms[i].pos); ctx.root.add(RE.mesh);
  // center: a molecular sphere - nodes sit on the sphere's vertices, revealed spread out as it grows
  const MAXN = 22, START = 9, SR = 4.7, cgroup = new THREE.Group(); ctx.root.add(cgroup);
  const coreNode = atom(GREYS[0], 0.95); cgroup.add(coreNode.g);
  const dirs = fib(MAXN, 1), center = [];
  for (let i = 0; i < MAXN; i++) { const d = dirs[i], r = SR * (0.92 + rnd() * 0.16); const a = atom(GREYS[1 + (i % 3)], 0.5 + rnd() * 0.45); a.g.position.set(d[0] * r, d[1] * r, d[2] * r); cgroup.add(a.g); center.push(a); }
  const order = Array.from({ length: MAXN }, (_, i) => i);
  for (let i = MAXN - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  let count = START;
  const rankVisible = () => { for (let i = 0; i < MAXN; i++) center[i].g.visible = false; for (let k = 0; k < count; k++) center[order[k]].g.visible = true; };
  rankVisible();
  cgroup.add(new THREE.Mesh(new THREE.SphereGeometry(SR + 0.4, 16, 12), new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.06, color: 0x2A2E36, depthWrite: false })));
  const qN = ["CAPTURE", "TRAIN", "PREDICT", "OPTIMIZE"], qLP = [[0, R + 5, 0], [R + 6.5, 0, 0], [0, -(R + 5), 0], [-(R + 6.5), 0, 0]];
  qN.forEach((nm, k) => label(ctx, nm, qLP[k], 9.5, 0.72));
  const cycLabel = label(ctx, "Cycle 1", [0, 0, 7], 12, 0.92);
  const head = comet(1.2); ctx.root.add(head);
  const feed = []; for (let i = 0; i < 6; i++) { const m = comet(0.7); ctx.root.add(m); feed.push({ m, active: false, p: 0, to: 0, from: [0, 0, 0] }); }
  const ringLit = new Float32Array(RN), edgeLit = new Float32Array(rp.length), centLit = new Float32Array(MAXN), _w = new THREE.Vector3();
  let u = 0, last = 0, cyc = 1, growth = 0, fc = 0; const SPEED = 0.12;
  return run(ctx, (dt, el) => {
    ringLit.fill(0); edgeLit.fill(0); centLit.fill(0);
    u = (u + SPEED * dt) % 1;
    if (u < last) { cyc++; cycLabel.textContent = "Cycle " + cyc; if (count < MAXN) { count++; rankVisible(); } growth = Math.min(1, growth + 0.16); const f = feed[fc]; fc = (fc + 1) % feed.length; f.active = true; f.p = 0; f.to = order[Math.floor(rnd() * count)]; f.from = [Math.cos(u * Math.PI * 2) * R, Math.sin(u * Math.PI * 2) * R, 0]; }
    last = u;
    growth = Math.max(0, growth - dt * 0.02);
    const ang = u * Math.PI * 2;
    for (let i = 0; i < RN; i++) { const behind = (ang - ringAtoms[i].ang + Math.PI * 2) % (Math.PI * 2); ringLit[i] = clamp01(1 - behind / (Math.PI * 0.8)); }
    for (let i = 0; i < rp.length; i++) { const behind = (ang - ringAtoms[rp[i][0]].ang + Math.PI * 2) % (Math.PI * 2); edgeLit[i] = clamp01(1 - behind / (Math.PI * 0.9)); }
    const hp = [Math.cos(ang) * R, Math.sin(ang) * R, 0]; head.position.set(hp[0], hp[1], hp[2]); head.material.opacity = 0.95; head.scale.setScalar(0.95 + 0.15 * Math.sin(el * 4));
    feed.forEach((f) => { if (!f.active) { f.m.visible = false; return; } f.p += dt / 1.0; if (f.p >= 1) { f.active = false; f.m.visible = false; centLit[f.to] = 1; return; } center[f.to].g.getWorldPosition(_w); const t = f.p; f.m.visible = true; f.m.position.set(f.from[0] + (_w.x - f.from[0]) * t, f.from[1] + (_w.y - f.from[1]) * t, f.from[2] + (_w.z - f.from[2]) * t); f.m.material.opacity = 0.9; centLit[f.to] = Math.max(centLit[f.to], t); });
    cgroup.scale.setScalar(0.78 + 0.4 * (count / MAXN));
    for (let i = 0; i < RN; i++) tint(ringAtoms[i], ringLit[i]);
    RE.setLit(edgeLit);
    tint(coreNode, 0.12 + growth * 0.3);
    for (let k = 0; k < count; k++) { const id = order[k]; tint(center[id], Math.max(centLit[id], growth * 0.4)); }
  });
}

const BUILDERS = { join: buildJoin, instances: buildInstances, reason: buildReason, workflow: buildWorkflow, compound: buildCompound, cycle: buildCycle };
document.querySelectorAll(".capviz").forEach((cv) => {
  const fn = BUILDERS[cv.dataset.viz];
  if (fn) { try { fn(cv); } catch (e) { console.warn("[capviz] init failed:", cv.dataset.viz, e); } }
});
