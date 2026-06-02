/* =========================================================================
   STRATIS — molecular system (3D)
   Vanilla-three.js port of the product's molecular-scene.tsx, greyscale,
   on a light theme: concentric wireframe ring-guide spheres + translucent
   atoms (outer sphere + bright core), gentle drift, auto-rotate, drag.
   Plus an illustrative "tracer" that bounces node→node along the graph to
   reveal the connections. Labels are generic (vertical-agnostic).
   ========================================================================= */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ----- geometry mirrored from molecular-graph.ts -----
const RING_RADII = [0, 8, 14, 20, 27, 34];
const RING_NODE  = [2.0, 1.3, 1.0, 0.9, 0.7, 0.6];
const RING_COUNT = [1, 10, 8, 10, 23, 18];
// greyscale (dark → light) — reads on the light card
const RING_GREY  = ["#1A1D21", "#3A4047", "#545B63", "#6C737B", "#868D95", "#9AA1A9"];
const LABEL_OP   = [1, 0.78, 0.78, 0.55, 0.4, 0.46];
const LABEL_PX   = [16, 11, 11, 9, 8, 8.5];

// generic, non-brand labels (same structure, no client data)
const AUD = ["In-Market", "Conquest", "Loyalists", "Lookalike", "High-Value", "Lapsed", "New Movers", "Affinity", "Local", "Seasonal"];
const CH  = ["Search", "Social", "Online Video", "CTV", "Audio", "Display", "Native", "OOH", "Programmatic"];
const FUN = ["Awareness", "Consideration", "Conversion"];
function labelFor(ring, i) {
  if (ring === 0) return "BRAND";
  if (ring === 1) return i < 3 ? `Tier ${i + 1}` : `Agency ${i - 2}`;
  if (ring === 2) return `Product ${i + 1}`;
  if (ring === 3) return AUD[i] || `Audience ${i + 1}`;
  if (ring === 4) return `Campaign ${String(i + 1).padStart(2, "0")}`;
  if (i < 9) return CH[i];
  if (i < 12) return FUN[i - 9];
  return `Region ${i - 11}`;
}

function fib(n, radius) {
  if (n === 1) return [[0, 0, 0]];
  const pts = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = ga * i;
    pts.push([radius * r * Math.cos(t), radius * y * 0.7, radius * r * Math.sin(t)]);
  }
  return pts;
}
const d2 = (a, b) => { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; };

function init(canvas) {
  const wrap = canvas.parentElement;

  // ----- nodes -----
  const nodes = [];
  for (let ring = 0; ring < RING_COUNT.length; ring++) {
    const pos = ring === 0 ? [[0, 0, 0]] : fib(RING_COUNT[ring], RING_RADII[ring]);
    pos.forEach((p, i) => nodes.push({
      base: p, ring, grey: RING_GREY[ring], vizR: RING_NODE[ring],
      label: labelFor(ring, i), angle: (360 / pos.length) * i,
    }));
  }

  // ----- adjacency (each node → 2 nearest in the inner ring) -----
  const byRing = {};
  nodes.forEach((n, gi) => { (byRing[n.ring] = byRing[n.ring] || []).push(gi); });
  const adj = nodes.map(() => []);
  const seen = new Set();
  const addEdge = (a, b) => { const k = a < b ? a + "_" + b : b + "_" + a; if (seen.has(k)) return; seen.add(k); adj[a].push(b); adj[b].push(a); };
  for (let ring = 1; ring < RING_COUNT.length; ring++) {
    const inner = byRing[ring - 1], k = Math.min(2, inner.length);
    for (const i of byRing[ring]) {
      const sorted = inner.map((j) => ({ j, d: d2(nodes[i].base, nodes[j].base) })).sort((a, b) => a.d - b.d);
      for (let m = 0; m < k; m++) addEdge(i, sorted[m].j);
    }
  }

  // ----- scene / camera / renderers -----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
  camera.position.set(0, 5, 86);   // zoomed out — full sphere in frame

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  wrap.appendChild(labelRenderer.domElement);

  // ----- lights (neutral / white for greyscale) -----
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.PointLight(0xffffff, 0.85); key.position.set(25, 30, 25); scene.add(key);
  const fill = new THREE.PointLight(0xffffff, 0.3); fill.position.set(-20, -15, 20); scene.add(fill);

  // ----- ring-guide wireframe spheres (the connected "web") -----
  for (let i = 1; i < RING_RADII.length; i++) {
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(RING_RADII[i], 24, 16),
      new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.07, color: 0x1a1d21, depthWrite: false })
    ));
  }

  // ----- atoms -----
  const atoms = [];
  for (const n of nodes) {
    const g = new THREE.Group();
    g.position.set(n.base[0], n.base[1], n.base[2]);
    const col = new THREE.Color(n.grey);
    const outer = new THREE.Mesh(
      new THREE.SphereGeometry(n.vizR, 24, 24),
      new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.4, emissive: col, emissiveIntensity: 0.18, roughness: 0.5, metalness: 0.05, depthWrite: false })
    );
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(n.vizR * 0.32, 16, 16),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.1 })
    );
    g.add(outer); g.add(core);

    const div = document.createElement("div");
    div.className = "mol-label";
    div.textContent = n.label;
    div.style.fontSize = LABEL_PX[n.ring] + "px";
    div.style.opacity = LABEL_OP[n.ring];
    if (n.ring === 0) div.style.fontWeight = "600";
    const label = new CSS2DObject(div);
    label.position.set(0, -(n.vizR + 0.6), 0);
    g.add(label);

    scene.add(g);
    atoms.push({ group: g, node: n, coreMat: core.material, outerMat: outer.material, grey: col.clone(), baseCore: 0.25, baseOuter: 0.18 });
  }

  // ----- branching signal-string -----
  // A blue line grows from a random start and BRANCHES node→node across the
  // network: one node can fan out to several others in different spots,
  // forming a connected sub-tree that spreads across the sphere to "find
  // patterns" in the org data. Capped (NOT the whole graph). New tree/cycle.
  const BLUE = new THREE.Color(0x57FFEB);
  const N = nodes.length;
  const EDGE_DUR = 0.42, D_MAX = 6, MAX_NODES = 24, HOLD = 1.7, FADE = 1.5;
  const GROW = D_MAX * EDGE_DUR, CYCLE = GROW + HOLD + FADE;
  const STARTS = [];
  nodes.forEach((n, i) => { if (n.ring <= 2) STARTS.push(i); });   // start inner — room to branch out

  function seg() { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3)); return g; }
  const lines = [];
  if (!reduce) {
    for (let i = 0; i < MAX_NODES; i++) {
      const mat = new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0 });
      const ln = new THREE.Line(seg(), mat); scene.add(ln); lines.push({ ln, mat });
    }
  }
  // grow a capped, branching sub-tree from a random start (BFS frontier, each
  // node fanning out to 1–2 unvisited neighbours, biased outward)
  function buildTree() {
    const start = STARTS[Math.floor(Math.random() * STARTS.length)];
    const used = new Set([start]), depthOf = new Map([[start, 0]]), edges = [];
    let frontier = [start];
    while (frontier.length && used.size < MAX_NODES) {
      const next = [];
      for (const u of frontier) {
        if (used.size >= MAX_NODES) break;
        const du = depthOf.get(u);
        if (du >= D_MAX) continue;
        const free = adj[u].filter((n) => !used.has(n));
        if (!free.length) continue;
        for (let k = free.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [free[k], free[j]] = [free[j], free[k]]; }
        const cr = nodes[u].ring;
        const out = free.filter((n) => nodes[n].ring >= cr);
        const cand = out.length ? out : free;
        const branch = used.size < 7 ? 2 : (Math.random() < 0.5 ? 2 : 1);  // fan out, esp. early
        for (let j = 0; j < Math.min(branch, cand.length) && used.size < MAX_NODES; j++) {
          const c = cand[j];
          used.add(c); depthOf.set(c, du + 1);
          edges.push({ p: u, c, start: du * EDGE_DUR });
          next.push(c);
        }
      }
      frontier = next;
    }
    const reach = new Map(); depthOf.forEach((d, n) => reach.set(n, d * EDGE_DUR));
    return { edges, reach };
  }

  let cycleIdx = -1, tree = { edges: [], reach: new Map() };
  const tip = new THREE.Vector3();
  function setGrey(a) {
    a.coreMat.color.copy(a.grey); a.coreMat.emissive.copy(a.grey); a.coreMat.emissiveIntensity = a.baseCore;
    a.outerMat.color.copy(a.grey); a.outerMat.emissive.copy(a.grey); a.outerMat.emissiveIntensity = a.baseOuter;
  }
  function propagate() {
    const idx = Math.floor(elapsed / CYCLE);
    if (idx !== cycleIdx) { cycleIdx = idx; tree = buildTree(); }
    const pt = elapsed % CYCLE;
    const fade = pt > GROW + HOLD ? Math.max(0, 1 - (pt - (GROW + HOLD)) / FADE) : 1;

    for (const a of atoms) setGrey(a);                       // only the growing tree lights

    const E = tree.edges;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      if (i >= E.length) { L.mat.opacity = 0; continue; }
      const e = E[i];
      const prog = Math.min(1, Math.max(0, (pt - e.start) / EDGE_DUR));
      if (prog <= 0) { L.mat.opacity = 0; continue; }
      const a = atoms[e.p].group.position, b = atoms[e.c].group.position;
      tip.lerpVectors(a, b, prog);
      const arr = L.ln.geometry.attributes.position.array;
      arr[0] = a.x; arr[1] = a.y; arr[2] = a.z; arr[3] = tip.x; arr[4] = tip.y; arr[5] = tip.z;
      L.ln.geometry.attributes.position.needsUpdate = true;
      L.mat.opacity = 0.95 * fade;
    }

    tree.reach.forEach((rt, n) => {                          // light each node as the wavefront reaches it
      const lit = Math.min(1, Math.max(0, (pt - (rt - EDGE_DUR)) / EDGE_DUR)) * fade;
      if (lit <= 0) return;
      const a = atoms[n];
      a.coreMat.color.copy(a.grey).lerp(BLUE, lit);
      a.coreMat.emissive.copy(a.grey).lerp(BLUE, lit);
      a.coreMat.emissiveIntensity = a.baseCore + (1.0 - a.baseCore) * lit;
      a.outerMat.color.copy(a.grey).lerp(BLUE, lit);
      a.outerMat.emissive.copy(a.grey).lerp(BLUE, lit);
      a.outerMat.emissiveIntensity = a.baseOuter + (0.6 - a.baseOuter) * lit;
    });
  }

  // ----- controls -----
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableZoom = false;
  controls.enableDamping = true; controls.dampingFactor = 0.05; controls.rotateSpeed = 0.5;
  controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.3;

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false); labelRenderer.setSize(w, h);
    camera.aspect = w / h || 1; camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(wrap);

  const clock = new THREE.Clock();
  let elapsed = 0, raf = null;
  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
    if (!reduce) {
      const d = 0.4;
      for (const a of atoms) {
        if (a.node.ring === 0) continue;
        const [bx, by, bz] = a.node.base, ang = a.node.angle;
        a.group.position.set(
          bx + Math.sin(elapsed * 0.3 + ang * 0.05) * d,
          by + Math.sin(elapsed * 0.4 + ang * 0.03) * d,
          bz + Math.cos(elapsed * 0.35 + ang * 0.04) * d
        );
      }
      propagate();
    }
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  loop();

  new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) { if (!raf) loop(); }
      else if (raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }, { threshold: 0 }).observe(canvas);
}

// ----- boot (after all module constants + init are initialized) -----
const canvas = document.getElementById("moleculeCanvas");
if (canvas) { try { init(canvas); } catch (e) { console.warn("[molecule] init failed:", e); } }
