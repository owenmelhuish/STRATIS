/* =========================================================================
   STRATIS — data flywheel (3D growing reasoning mass)
   Same visual language as js/molecule.js: greyscale node spheres (translucent
   outer + bright core), faint plexus wireframe, a turquoise signal, CSS2D
   labels, OrbitControls, IntersectionObserver pause, reduced-motion fallback.

   An organic 3D node cloud — evenly spread, denser toward the middle, tapering
   at the ends. The full structure is present from the start; over time it keeps
   growing as glowing nodes stream IN from a data stream above and a user-input
   stream below. A turquoise reasoning signal flows as a clear comet, node by
   node, along a connected spine from the INPUT (left) to the OUTPUT (right).
   ========================================================================= */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BASE = 80, GROW = 42, CLUSTER = 9, CLY = 22;   // structure · centre in-fill · title clusters · cluster height
const SX = 46, SY = 13, SZ = 15;
const MIND2 = 5.2 * 5.2;                    // minimum spacing² (avoids a tight centre pile)
const INTERVAL = 0.6, TRAVEL = 1.9;         // a node streams in every INTERVAL s
const TRAIL = 3, SPINE_SPEED = 1.25;        // comet trail length · nodes/sec along the spine
const SIGNAL = new THREE.Color(0x57FFEB);
const BG = new THREE.Color(0xE7EBEF);
const EDGE_GREY = new THREE.Color(0x7c838c);
const GREYS = ["#6C737B", "#565D66", "#454C56", "#363C45", "#272C34"];
const TAU = Math.PI * 2;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const dist2 = (a, b) => { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; };

function init(canvas) {
  const wrap = canvas.parentElement;
  const rnd = (() => { let s = 20260601; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();

  // ----- nodes: structure spread + two loose title clusters (data top, user input bottom) -----
  const nodes = [];
  function place(opt) {
    let target;
    for (let a = 0; a < 14; a++) {
      if (opt.cluster) target = [(rnd() - 0.5) * 24, opt.cy + (rnd() - 0.5) * 7, (rnd() - 0.5) * 12];
      else { const rr = opt.rr(); const th = rnd() * TAU, ph = Math.acos(2 * rnd() - 1); target = [Math.sin(ph) * Math.cos(th) * rr * SX, Math.cos(ph) * rr * SY, Math.sin(ph) * Math.sin(th) * rr * SZ]; }
      if (nodes.every((n) => dist2(n.target, target) > MIND2)) break;
    }
    const gi = Math.min(GREYS.length - 1, Math.floor(Math.pow(rnd(), 1.3) * GREYS.length));
    const idx = nodes.length;
    nodes.push({ target, grey: GREYS[gi], rad: 0.6 + Math.pow(rnd(), 2) * 1.0, central: !!opt.central, cluster: !!opt.cluster, x: target[0] });
    return idx;
  }
  for (let i = 0; i < BASE; i++) place({ rr: () => Math.pow(rnd(), 0.7) });
  const topCluster = [], botCluster = [];
  for (let i = 0; i < CLUSTER; i++) topCluster.push(place({ cluster: true, cy: CLY }));
  for (let i = 0; i < CLUSTER; i++) botCluster.push(place({ cluster: true, cy: -CLY }));
  const growIdx = [];
  for (let i = 0; i < GROW; i++) growIdx.push(place({ central: true, rr: () => 0.18 + Math.pow(rnd(), 0.9) * 0.5 }));
  // input / output terminal nodes (far left / far right): the entry & exit of the reasoning flow
  const inputNode = nodes.length; nodes.push({ target: [-SX - 6, 0, 0], grey: GREYS[2], rad: 1.8, central: false, cluster: false, terminal: true, x: -SX - 6 });
  const outputNode = nodes.length; nodes.push({ target: [SX + 6, 0, 0], grey: GREYS[2], rad: 1.8, central: false, cluster: false, terminal: true, x: SX + 6 });

  nodes.forEach((nd) => { if (!nd.central) { nd.origin = nd.target; nd.settleStart = rnd() * (nd.cluster ? 1.2 : 0.8); nd.travel = nd.cluster ? 0.7 : 0.6; } });
  growIdx.forEach((gi) => { nodes[gi].origin = nodes[gi].target; nodes[gi].settleStart = rnd() * 2.5; nodes[gi].travel = 0.9; });  // central mass — present from the start (the model)

  // ----- edges: k-nearest + guaranteed left→right links -----
  const edges = [], seen = new Set(), adj = new Map(), edgeIndex = new Map();
  function addEdge(i, j) {
    const key = i < j ? i + "_" + j : j + "_" + i; if (seen.has(key)) return; seen.add(key);
    edgeIndex.set(key, edges.length); edges.push([i, j]);
    if (!adj.has(i)) adj.set(i, []); if (!adj.has(j)) adj.set(j, []);
    adj.get(i).push(j); adj.get(j).push(i);
  }
  const isStruct = (i) => !nodes[i].cluster && !nodes[i].terminal;   // structure + growth only
  for (let i = 0; i < nodes.length; i++) {
    if (!isStruct(i)) continue;
    const di = nodes.map((n, j) => ({ j, d: dist2(nodes[i].target, n.target) })).filter((o) => o.j !== i && isStruct(o.j)).sort((a, b) => a.d - b.d);
    for (let m = 0; m < 3; m++) { if (!di[m] || di[m].d > 17 * 17) break; addEdge(i, di[m].j); }
    let best = null, bd = Infinity;
    for (let j = 0; j < nodes.length; j++) { if (isStruct(j) && nodes[j].x > nodes[i].x + 1.5) { const d = dist2(nodes[i].target, nodes[j].target); if (d < bd) { bd = d; best = j; } } }
    if (best != null && bd < 24 * 24) addEdge(i, best);
  }
  // loose intra-cluster mesh — clusters are NOT wired to the structure (they feed it only via travelling nodes)
  [topCluster, botCluster].forEach((cl) => cl.forEach((ci) => {
    const di = cl.filter((j) => j !== ci).map((j) => ({ j, d: dist2(nodes[ci].target, nodes[j].target) })).sort((a, b) => a.d - b.d);
    for (let m = 0; m < 2 && di[m]; m++) addEdge(ci, di[m].j);
  }));
  const eIdx = (a, b) => edgeIndex.get(a < b ? a + "_" + b : b + "_" + a);

  // ----- connected input→output spines -----
  const baseSet = new Set(); for (let i = 0; i < nodes.length; i++) if (isStruct(i)) baseSet.add(i);   // whole structure → path can reach the far-right edge
  function buildPath(start) {
    const path = [start], vis = new Set([start]); let cur = start, guard = 0;
    while (guard++ < 90) {
      const nbrs = (adj.get(cur) || []).filter((j) => baseSet.has(j) && !vis.has(j) && nodes[j].x > nodes[cur].x + 0.3);
      if (!nbrs.length) break;
      nbrs.sort((a, b) => dist2(nodes[cur].target, nodes[a].target) - dist2(nodes[cur].target, nodes[b].target));  // nearest next node → small, gradual steps
      const pick = nbrs[Math.floor(rnd() * Math.min(2, nbrs.length))];
      path.push(pick); vis.add(pick); cur = pick;
    }
    return path;
  }
  // anchor the Input to the structure node PHYSICALLY NEAREST it (a far-left node), so the flow starts at the edge — never jumps to the middle
  const baseArr = [...baseSet];
  const nearestBase = (px) => baseArr.reduce((b, j) => (dist2(nodes[j].target, px) < dist2(nodes[b].target, px) ? j : b), baseArr[0]);
  const spines = [];
  const starts = [nearestBase(nodes[inputNode].target), nearestBase([nodes[inputNode].target[0] + 4, 9, 2])];
  for (const start of starts) {
    if (spines.length >= 2) break;
    const p = buildPath(start);
    if (p.length < 4) continue;
    addEdge(inputNode, start);                       // clear entry line:  Input → nearest left node
    addEdge(p[p.length - 1], outputNode);            // clear exit line:   right-end node → Output
    spines.push({ nodes: [inputNode, ...p, outputNode], u: spines.length === 0 ? 0 : (p.length + 2) * 0.6, head: null });
  }
  if (!spines.length) { const a = nearestBase(nodes[inputNode].target), p = buildPath(a); addEdge(inputNode, a); addEdge(p[p.length - 1], outputNode); spines.push({ nodes: [inputNode, ...p, outputNode], u: 0, head: null }); }
  const pathNodeTint = new Float32Array(nodes.length), pathEdgeTint = new Float32Array(edges.length);
  for (const sp of spines) for (let s = 0; s < sp.nodes.length; s++) { pathNodeTint[sp.nodes[s]] = 0.34; if (s < sp.nodes.length - 1) { const ei = eIdx(sp.nodes[s], sp.nodes[s + 1]); if (ei != null) pathEdgeTint[ei] = 0.52; } }

  // ----- scene / camera / renderers -----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
  camera.position.set(0, 3, 86);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute"; labelRenderer.domElement.style.inset = "0"; labelRenderer.domElement.style.pointerEvents = "none";
  wrap.appendChild(labelRenderer.domElement);
  const root = new THREE.Group(); scene.add(root);
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const key = new THREE.PointLight(0xffffff, 0.75); key.position.set(20, 30, 30); scene.add(key);
  const fillL = new THREE.PointLight(0xffffff, 0.3); fillL.position.set(-24, -16, 18); scene.add(fillL);

  // ----- edge mesh -----
  const ePos = new Float32Array(edges.length * 6), eCol = new Float32Array(edges.length * 6);
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute("color", new THREE.BufferAttribute(eCol, 3));
  edges.forEach((e, i) => { const p = nodes[e[0]].target, q = nodes[e[1]].target; ePos.set([p[0], p[1], p[2], q[0], q[1], q[2]], i * 6); });
  root.add(new THREE.LineSegments(eGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false })));

  // ----- atoms -----
  const atoms = nodes.map((nd) => {
    const g = new THREE.Group();
    const col = new THREE.Color(nd.grey);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(nd.rad, 18, 18),
      new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0, emissive: col, emissiveIntensity: 0.18, roughness: 0.5, metalness: 0.05, depthWrite: false }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(nd.rad * 0.4, 12, 12),
      new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0, emissive: col, emissiveIntensity: 0.28, roughness: 0.3, metalness: 0.1 }));
    g.add(outer); g.add(core); root.add(g);
    return { group: g, nd, coreMat: core.material, outerMat: outer.material, grey: col.clone(), sp: 0 };
  });

  // ----- comet heads (one per spine) -----
  for (const sp of spines) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), new THREE.MeshStandardMaterial({ color: SIGNAL, emissive: SIGNAL, emissiveIntensity: 1.1, transparent: true, opacity: 0, roughness: 0.3 }));
    root.add(m); sp.head = m;
  }

  // ----- labels -----
  const labelDivs = [];
  function label(text, x, y, z) { const div = document.createElement("div"); div.className = "mol-label"; div.textContent = text; div.style.fontSize = "11px"; const o = new CSS2DObject(div); o.position.set(x, y, z); root.add(o); labelDivs.push(div); }
  label("Data input", 0, CLY + 6, 0); label("User input", 0, -(CLY + 6), 0); label("Input", -SX - 13, 0, 0); label("Output", SX + 13, 0, 0);

  // ----- data-flywheel particles (pool): released only when the comet ACTIVATES the Output node -----
  const N_FLOW = 30;
  const outPos = [SX + 6, 0, 0];
  const flow = [];
  for (let i = 0; i < N_FLOW; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 12), new THREE.MeshStandardMaterial({ color: SIGNAL, emissive: SIGNAL, emissiveIntensity: 0.95, transparent: true, opacity: 0, roughness: 0.3 }));
    m.visible = false; root.add(m);
    flow.push({ m, active: false, p: 0, dur: 5, toData: true, cl: 0, entry: 0 });
  }
  let flowCursor = 0;
  function emitBurst() {                              // Output reached → release a burst that populates the input pools
    for (let b = 0; b < 6; b++) {
      const f = flow[flowCursor]; flowCursor = (flowCursor + 1) % N_FLOW;
      f.active = true; f.p = 0; f.dur = 5 + rnd() * 1.6; f.toData = b % 2 === 0;
      const clArr = f.toData ? topCluster : botCluster;
      f.cl = clArr[Math.floor(rnd() * clArr.length)];
      f.entry = growIdx[Math.floor(rnd() * growIdx.length)];
    }
  }

  // ----- controls -----
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0); controls.enablePan = false; controls.enableZoom = false;
  controls.enableDamping = true; controls.dampingFactor = 0.05; controls.rotateSpeed = 0.4; controls.autoRotate = false;
  controls.minPolarAngle = Math.PI * 0.38; controls.maxPolarAngle = Math.PI * 0.6;
  controls.minAzimuthAngle = -0.45; controls.maxAzimuthAngle = 0.45;
  function resize() { const w = wrap.clientWidth, h = wrap.clientHeight; renderer.setSize(w, h, false); labelRenderer.setSize(w, h); camera.aspect = w / h || 1; camera.updateProjectionMatrix(); }
  resize(); new ResizeObserver(resize).observe(wrap);

  // ----- animation -----
  const clock = new THREE.Clock();
  let elapsed = 0, raf = null;
  const _c = new THREE.Color(), _g = new THREE.Color(), _p = new THREE.Vector3(), _q = new THREE.Vector3();
  const nodeLit = new Float32Array(nodes.length), edgeLit = new Float32Array(edges.length);

  function paint(dt) {
    root.rotation.y = Math.sin(elapsed * 0.09) * 0.09;
    for (const d of labelDivs) d.style.opacity = (0.82 * clamp01(elapsed / 2)).toFixed(2);

    // nodes settle; growth nodes glow turquoise while streaming in
    for (const a of atoms) {
      const sp = clamp01((elapsed - a.nd.settleStart) / a.nd.travel);
      a.sp = sp;
      if (sp <= 0) { a.coreMat.opacity = 0; a.outerMat.opacity = 0; continue; }
      const e = easeIO(sp);
      a.group.position.set(
        a.nd.origin[0] + (a.nd.target[0] - a.nd.origin[0]) * e,
        a.nd.origin[1] + (a.nd.target[1] - a.nd.origin[1]) * e,
        a.nd.origin[2] + (a.nd.target[2] - a.nd.origin[2]) * e);
    }

    // clear flow: a comet travels node-by-node along each spine, input→output
    nodeLit.set(pathNodeTint); edgeLit.set(pathEdgeTint);
    for (const sp of spines) {
      const len = sp.nodes.length;
      sp.u += SPINE_SPEED * dt; if (sp.u >= len - 1) { sp.u = 0; emitBurst(); }   // comet reached Output → feed the input pools
      const seg = Math.floor(sp.u), frac = sp.u - seg;
      for (let tt = 0; tt <= TRAIL; tt++) {
        const s = seg - tt; if (s < 0 || s >= len - 1) continue;
        const inten = tt === 0 ? 1 : Math.max(0, 1 - tt / (TRAIL + 1));
        const n0 = sp.nodes[s], n1 = sp.nodes[s + 1], ei = eIdx(n0, n1);
        if (ei != null) edgeLit[ei] = Math.max(edgeLit[ei], inten);
        nodeLit[n1] = Math.max(nodeLit[n1], inten);
        nodeLit[n0] = Math.max(nodeLit[n0], inten * 0.7);
      }
      // head sphere position + fade at the ends
      _p.fromArray(nodes[sp.nodes[seg]].target); _q.fromArray(nodes[sp.nodes[Math.min(len - 1, seg + 1)]].target);
      sp.head.position.lerpVectors(_p, _q, frac);
      sp.head.material.opacity = clamp01(Math.min(sp.u, len - 1 - sp.u) * 5);
    }

    // flywheel particles — only the active ones (released by emitBurst): Output → input cluster → into the structure
    for (const f of flow) {
      if (!f.active) { f.m.visible = false; continue; }
      f.p += dt / f.dur; if (f.p >= 1) { f.active = false; f.m.visible = false; continue; }
      f.m.visible = true;
      const p = f.p, c = nodes[f.cl].target, en = nodes[f.entry].target;
      let op = 0.95;
      if (p < 0.3) {                                   // Output → cluster (output populates the input pool)
        const t = p / 0.3, mt = 1 - t, cx = SX * 0.6, cy = (f.toData ? 1 : -1) * CLY * 1.5;
        f.m.position.set(mt * mt * outPos[0] + 2 * mt * t * cx + t * t * c[0], mt * mt * outPos[1] + 2 * mt * t * cy + t * t * c[1], t * t * c[2]);
        op = clamp01(t * 4) * 0.95;
      } else if (p < 0.42) {                           // arrived — populates the cluster
        f.m.position.set(c[0], c[1], c[2]); nodeLit[f.cl] = Math.max(nodeLit[f.cl], 1);
      } else if (p < 0.86) {                           // cluster → structure (feeds the model)
        const t = easeIO((p - 0.42) / 0.44);
        f.m.position.set(c[0] + (en[0] - c[0]) * t, c[1] + (en[1] - c[1]) * t, c[2] + (en[2] - c[2]) * t);
      } else {                                         // fed in — flash the node it joined, fade out
        f.m.position.set(en[0], en[1], en[2]); op = (1 - (p - 0.86) / 0.14) * 0.95; nodeLit[f.entry] = Math.max(nodeLit[f.entry], 1);
      }
      f.m.material.opacity = op; f.m.scale.setScalar(0.55 + 0.55 * clamp01(op / 0.95));
    }

    const modelGlow = Math.min(0.15, elapsed * 0.004);                    // the model strengthens as it's fed
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i]; if (a.sp <= 0) continue;
      const streaming = a.nd.central && a.sp < 0.96 ? (1 - a.sp) : 0;       // glowing while it streams in
      const floor = (!a.nd.cluster && !a.nd.terminal) ? modelGlow : 0;
      const t = Math.max(a.sp > 0.8 ? nodeLit[i] : 0, streaming, a.sp > 0.8 ? floor : 0);
      _c.copy(a.grey).lerp(SIGNAL, t);
      a.coreMat.color.copy(_c); a.coreMat.emissive.copy(_c); a.coreMat.emissiveIntensity = 0.28 + t * 1.0; a.coreMat.opacity = a.sp;
      a.outerMat.color.copy(_c); a.outerMat.emissive.copy(_c); a.outerMat.emissiveIntensity = 0.18 + t * 0.5; a.outerMat.opacity = 0.42 * a.sp;
      a.group.scale.setScalar(0.45 + 0.55 * a.sp + t * 0.45);
    }
    for (let i = 0; i < edges.length; i++) {
      const a = atoms[edges[i][0]], b = atoms[edges[i][1]];
      const alpha = Math.min(a.sp, b.sp), lit = (alpha > 0.8) ? edgeLit[i] : 0;
      _g.copy(EDGE_GREY).lerp(SIGNAL, Math.min(1, lit));
      _c.copy(BG).lerp(_g, clamp01(alpha) * (0.72 + 0.28 * lit));
      eCol[i * 6] = _c.r; eCol[i * 6 + 1] = _c.g; eCol[i * 6 + 2] = _c.b;
      eCol[i * 6 + 3] = _c.r; eCol[i * 6 + 4] = _c.g; eCol[i * 6 + 5] = _c.b;
    }
    eGeo.attributes.color.needsUpdate = true;
  }

  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    if (!reduce) paint(dt);
    controls.update(); renderer.render(scene, camera); labelRenderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  if (reduce) { elapsed = 12; spines.forEach((s) => { s.u = (s.nodes.length - 1) * 0.5; }); emitBurst(); flow.forEach((f, i) => { if (f.active) f.p = 0.12 + (i % 6) * 0.14; }); paint(0.0001); controls.update(); renderer.render(scene, camera); labelRenderer.render(scene, camera); }
  else loop();

  new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) { if (!raf && !reduce) { elapsed = 0; clock.start(); loop(); } }
      else if (raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }, { threshold: 0.12 }).observe(canvas);
}

const canvas = document.getElementById("flywheelCanvas");
if (canvas) { try { init(canvas); } catch (e) { console.warn("[flywheel] init failed:", e); } }
