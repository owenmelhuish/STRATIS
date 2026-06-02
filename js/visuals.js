/* =========================================================================
   STRATIS - generative visual layer
   Enterprise-grade instrument diagrams (SVG). Each diagram is built to
   *explain* its concept, not just decorate. Abstract, non-literal - no
   product UI, no fabricated proof.
     ribbon   - signature flowing hero atmosphere
     signal   - signal weighting (Block A: sees across everything)
     converge - reasoning flow into one decision (Block B: reasoned as one)
     compound - compounding-understanding chart (Block C: compounds over time)
     core     - the intelligence core ingesting every dimension
   ========================================================================= */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  const C = {
    blue: "#57FFEB", deep: "#16C6B2", steel: "#4E7BC4", cyan: "#45B4DA", violet: "#6E6BFF",
    ink: "#16181C", ink1: "#2A2E34", ink2: "#535860", ink3: "#82888F", ink4: "#A7ACB2",
    line: "rgba(22,24,28,0.10)", track: "#E3E6EB", white: "#FFFFFF",
  };

  /* ---- svg helpers ---- */
  function E(tag, attrs, kids) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (kids) kids.forEach((c) => c && e.appendChild(c));
    return e;
  }
  function svg(vb, cls) { return E("svg", { viewBox: vb, preserveAspectRatio: "xMidYMid meet", class: cls || "viz-svg" }); }
  function slice(vb, cls) { return E("svg", { viewBox: vb, preserveAspectRatio: "xMidYMid slice", class: cls || "viz-svg" }); }
  function lgrad(id, stops, a) {
    const g = E("linearGradient", Object.assign({ id }, a || { x1: "0", y1: "0", x2: "1", y2: "0" }));
    stops.forEach(([o, c, op]) => g.appendChild(E("stop", { offset: o, "stop-color": c, "stop-opacity": op == null ? 1 : op })));
    return g;
  }
  function rgrad(id, stops) {
    const g = E("radialGradient", { id });
    stops.forEach(([o, c, op]) => g.appendChild(E("stop", { offset: o, "stop-color": c, "stop-opacity": op == null ? 1 : op })));
    return g;
  }
  function rr(x, y, w, h, r, attrs) { return E("rect", Object.assign({ x, y, width: w, height: h, rx: r }, attrs || {})); }
  function T(x, y, s, o) {
    o = o || {};
    const t = E("text", {
      x, y, "font-size": o.size || 10.5, fill: o.fill || C.ink3,
      "letter-spacing": o.ls == null ? 1.2 : o.ls, "text-anchor": o.anchor || "start",
      "font-weight": o.weight || 400,
    });
    if (o.rotate) t.setAttribute("transform", "rotate(" + o.rotate + " " + x + " " + y + ")");
    t.textContent = o.upper === false ? s : String(s).toUpperCase();
    return t;
  }
  const rnd = (s) => { const x = Math.sin(s * 99.13) * 43758.5; return x - Math.floor(x); };

  /* ----------------------------------------------------------------- */
  /*  Ribbon (hero)                                                    */
  /* ----------------------------------------------------------------- */
  function tileBand(amp, mid, thick, phase) {
    const W = 1200, step = 30, cycles = 2, f = (Math.PI * 2 * cycles) / W;
    let top = [], bot = [];
    for (let x = 0; x <= W * 2 + step; x += step) {
      const yt = mid + amp * Math.sin(f * x + phase);
      const yb = yt + thick + amp * 0.3 * Math.sin(f * x + phase + 1.7);
      top.push([x, yt]); bot.push([x, yb]);
    }
    let d = "M " + top[0][0] + " " + top[0][1];
    for (let i = 1; i < top.length; i++) { const a = top[i - 1], b = top[i], cx = (a[0] + b[0]) / 2; d += " C " + cx + " " + a[1] + " " + cx + " " + b[1] + " " + b[0] + " " + b[1]; }
    for (let i = bot.length - 1; i >= 0; i--) { const b = bot[i], a = bot[Math.min(i + 1, bot.length - 1)], cx = (a[0] + b[0]) / 2; d += " C " + cx + " " + a[1] + " " + cx + " " + b[1] + " " + b[0] + " " + b[1]; }
    return d + " Z";
  }
  function renderRibbon(host) {
    const s = slice("0 0 1200 460");
    const defs = E("defs");
    defs.appendChild(lgrad("rb1", [["0", C.violet, 0], ["0.25", C.blue, 0.9], ["0.6", C.cyan, 0.8], ["1", C.steel, 0]]));
    defs.appendChild(lgrad("rb2", [["0", C.cyan, 0], ["0.4", C.blue, 0.85], ["0.7", C.violet, 0.7], ["1", C.deep, 0]]));
    defs.appendChild(lgrad("rb3", [["0", C.steel, 0], ["0.5", C.cyan, 0.6], ["1", C.blue, 0]]));
    const blur = E("filter", { id: "rbBlur", x: "-10%", y: "-40%", width: "120%", height: "180%" });
    blur.appendChild(E("feGaussianBlur", { stdDeviation: "9" }));
    defs.appendChild(blur); s.appendChild(defs);
    [{ g: "rb1", amp: 34, mid: 215, thick: 60, phase: 0, dur: 26, op: 0.85 },
     { g: "rb2", amp: 46, mid: 240, thick: 42, phase: 2.1, dur: 34, op: 0.7 },
     { g: "rb3", amp: 26, mid: 200, thick: 30, phase: 4, dur: 44, op: 0.6 }].forEach((b) => {
      const grp = E("g", { class: "ribbon-band", filter: "url(#rbBlur)", style: "animation-duration:" + b.dur + "s;mix-blend-mode:multiply;opacity:" + b.op });
      grp.appendChild(E("path", { d: tileBand(b.amp, b.mid, b.thick, b.phase), fill: "url(#" + b.g + ")" }));
      s.appendChild(grp);
    });
    host.appendChild(s);
  }

  /* small framing chrome shared by the panel diagrams */
  function frame(s, title) {
    s.appendChild(T(26, 38, title, { size: 10, fill: C.ink3, ls: 1.6 }));
    s.appendChild(E("line", { x1: 26, y1: 48, x2: 374, y2: 48, stroke: C.line, "stroke-width": 1 }));
  }

  /* ----------------------------------------------------------------- */
  /*  Block A - SIGNAL WEIGHTING                                       */
  /*  named inputs scored through "your context" → amplified / set aside */
  /* ----------------------------------------------------------------- */
  function renderSignal(host) {
    const s = svg("0 0 400 320", "viz-svg cap-viz");
    const defs = E("defs");
    defs.appendChild(rgrad("sgGlow", [["0", C.blue, 0.5], ["1", C.blue, 0]]));
    s.appendChild(defs);
    frame(s, "Input signals");
    s.appendChild(T(374, 38, "Weight", { size: 10, fill: C.ink3, ls: 1.6, anchor: "end" }));

    // "your context" filter guide
    s.appendChild(E("line", { x1: 222, y1: 64, x2: 222, y2: 250, stroke: C.line, "stroke-width": 1, "stroke-dasharray": "2 4" }));
    s.appendChild(T(216, 157, "Your context", { size: 8.5, fill: C.signal || C.blue, ls: 1.6, anchor: "middle", rotate: -90, fill: C.blue }));

    const rows = [
      ["Performance", 0.92, true], ["Market shift", 0.74, true],
      ["Brand strategy", 0.86, true], ["Audience", 0.58, true],
      ["Competitor move", 0.30, false], ["Platform noise", 0.14, false],
    ];
    const x0 = 244, bw = 130, y0 = 80, step = 30;
    rows.forEach((r, i) => {
      const [label, w, hot] = r, y = y0 + i * step;
      // node marker
      if (hot) {
        s.appendChild(E("circle", { cx: 32, cy: y, r: 8, fill: "url(#sgGlow)", class: "viz-pop", style: "animation-delay:" + (0.2 + i * 0.08) + "s" }));
        s.appendChild(E("circle", { cx: 32, cy: y, r: 3.4, fill: C.blue }));
      } else {
        s.appendChild(E("circle", { cx: 32, cy: y, r: 3.2, fill: "none", stroke: C.ink4, "stroke-width": 1.4 }));
      }
      s.appendChild(T(46, y + 3.6, label, { size: 11, fill: hot ? C.ink1 : C.ink4, ls: 0.4, upper: false, weight: hot ? 500 : 400 }));
      // weight value
      s.appendChild(T(236, y + 3.6, Math.round(w * 100), { size: 9, fill: hot ? C.ink2 : C.ink4, ls: 0.5, anchor: "end" }));
      // track + fill
      s.appendChild(rr(x0, y - 3, bw, 6, 3, { fill: C.track }));
      s.appendChild(rr(x0, y - 3, bw * w, 6, 3, {
        fill: hot ? C.blue : C.ink4, opacity: hot ? 1 : 0.5,
        class: "viz-bar", style: "animation-delay:" + (0.15 + i * 0.08) + "s",
      }));
    });
    s.appendChild(T(26, 300, "Relevant signal amplified · noise set aside", { size: 9.5, fill: C.ink3, ls: 0.4, upper: false }));
    host.appendChild(s);
  }

  /* ----------------------------------------------------------------- */
  /*  Block B - REASONING FLOW                                         */
  /*  every dimension → reasoning core → one decision (+ rationale)    */
  /* ----------------------------------------------------------------- */
  function renderConverge(host) {
    const s = svg("0 0 400 320", "viz-svg cap-viz");
    const defs = E("defs");
    defs.appendChild(lgrad("cvEdge", [["0", C.steel, 0.15], ["1", C.blue, 0.9]]));
    defs.appendChild(rgrad("cvCore", [["0", C.white, 0.95], ["0.4", C.cyan, 0.7], ["1", C.blue, 0]]));
    s.appendChild(defs);
    frame(s, "Reasoning across dimensions");

    const dims = ["Performance", "Brand", "Market", "History", "Projection"];
    const cx = 232, cy = 168;
    const edges = E("g", { fill: "none", stroke: "url(#cvEdge)", "stroke-width": 1.6 });
    dims.forEach((d, i) => {
      const y = 86 + i * 38;
      s.appendChild(T(28, y + 3.5, d, { size: 10.5, fill: C.ink1, ls: 0.3, upper: false }));
      s.appendChild(E("circle", { cx: 128, cy: y, r: 3.4, fill: C.steel }));
      const mx = (128 + cx) / 2;
      edges.appendChild(E("path", {
        d: "M 128 " + y + " Q " + mx + " " + y + " " + cx + " " + cy,
        class: "viz-flow", "stroke-dasharray": "4 9", style: "animation-delay:" + (i * 0.3) + "s",
      }));
    });
    s.appendChild(edges);

    // reasoning core
    s.appendChild(E("circle", { cx, cy, r: 30, fill: "url(#cvCore)", class: "viz-breathe" }));
    const ticks = E("g", { class: "viz-spin", style: "animation-duration:48s", stroke: C.blue, "stroke-width": 1, opacity: 0.5 });
    ticks.appendChild(E("circle", { cx, cy, r: 22, fill: "none" }));
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      ticks.appendChild(E("line", { x1: cx + Math.cos(rad) * 22, y1: cy + Math.sin(rad) * 22, x2: cx + Math.cos(rad) * 26, y2: cy + Math.sin(rad) * 26 }));
    }
    s.appendChild(ticks);
    s.appendChild(E("circle", { cx, cy, r: 6.5, fill: C.blue }));
    s.appendChild(T(cx, cy + 46, "Reason", { size: 8.5, fill: C.blue, ls: 2, anchor: "middle" }));

    // output edge → decision
    s.appendChild(E("path", { d: "M " + (cx + 30) + " " + cy + " L 296 " + cy, stroke: C.blue, "stroke-width": 1.8, fill: "none", class: "viz-flow", "stroke-dasharray": "4 8" }));
    s.appendChild(E("path", { d: "M 292 " + (cy - 4) + " L 300 " + cy + " L 292 " + (cy + 4), stroke: C.blue, "stroke-width": 1.8, fill: "none" }));

    // decision card
    const dx = 302, dy = 126, dw = 80, dh = 84;
    s.appendChild(rr(dx, dy, dw, dh, 12, { fill: C.white, stroke: C.line, "stroke-width": 1, class: "viz-rise", style: "animation-delay:0.5s; transform-origin:center" }));
    const card = E("g", { class: "viz-rise", style: "animation-delay:0.62s" });
    card.appendChild(T(dx + 12, dy + 20, "Decision", { size: 8.5, fill: C.blue, ls: 1.6 }));
    [0, 1, 2].forEach((k) => card.appendChild(rr(dx + 12, dy + 30 + k * 8, [54, 44, 50][k], 3, 1.5, { fill: C.track })));
    card.appendChild(T(dx + 12, dy + 66, "Confidence", { size: 7, fill: C.ink3, ls: 1 }));
    card.appendChild(rr(dx + 12, dy + 70, 56, 4, 2, { fill: C.track }));
    card.appendChild(rr(dx + 12, dy + 70, 56 * 0.86, 4, 2, { fill: C.blue, class: "viz-bar", style: "animation-delay:0.8s" }));
    s.appendChild(card);

    s.appendChild(T(26, 300, "Every dimension weighed into one decision", { size: 9.5, fill: C.ink3, ls: 0.4, upper: false }));
    host.appendChild(s);
  }

  /* ----------------------------------------------------------------- */
  /*  Block C - COMPOUNDING CHART                                      */
  /*  understanding curve vs a flat "resets each question" baseline    */
  /* ----------------------------------------------------------------- */
  function renderCompound(host) {
    const s = svg("0 0 400 320", "viz-svg cap-viz");
    const defs = E("defs");
    defs.appendChild(lgrad("cpArea", [["0", C.blue, 0.22], ["1", C.blue, 0]], { x1: "0", y1: "0", x2: "0", y2: "1" }));
    s.appendChild(defs);
    frame(s, "Judgment over time");

    const X0 = 54, X1 = 372, BASE = 250, TOP = 70;
    // gridlines
    [210, 170, 130, 90].forEach((y) => s.appendChild(E("line", { x1: X0, y1: y, x2: X1, y2: y, stroke: C.line, "stroke-width": 1, "stroke-dasharray": "1 5" })));
    // axes
    s.appendChild(E("line", { x1: X0, y1: BASE, x2: X1, y2: BASE, stroke: C.ink4, "stroke-width": 1 }));
    s.appendChild(T(34, 162, "Understanding", { size: 8.5, fill: C.ink3, ls: 1.2, anchor: "middle", rotate: -90 }));
    s.appendChild(T(372, 286, "Time →", { size: 9, fill: C.ink3, ls: 0.6, anchor: "end", upper: false }));

    // flat baseline reference ("without memory")
    s.appendChild(E("line", { x1: X0, y1: 236, x2: X1, y2: 236, stroke: C.ink4, "stroke-width": 1.4, "stroke-dasharray": "5 5", opacity: 0.8 }));
    s.appendChild(T(370, 230, "without memory · resets each time", { size: 8.5, fill: C.ink4, ls: 0.3, anchor: "end", upper: false }));

    // compounding curve
    const pts = [[X0, 242], [120, 226], [216, 178], [304, 110], [X1, 70]];
    let d = "M " + pts[0][0] + " " + pts[0][1];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], cx = (a[0] + b[0]) / 2; d += " C " + cx + " " + a[1] + " " + cx + " " + b[1] + " " + b[0] + " " + b[1]; }
    // area
    s.appendChild(E("path", { d: d + " L " + X1 + " " + BASE + " L " + X0 + " " + BASE + " Z", fill: "url(#cpArea)", class: "viz-fade", style: "animation-delay:0.5s" }));
    // line
    s.appendChild(E("path", { d, fill: "none", stroke: C.blue, "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round", class: "viz-draw" }));

    // year ticks + data dots
    const marks = [[120, 226, "Y1", "baseline"], [216, 178, "Y2", ""], [304, 110, "Y3", "sharper"]];
    marks.forEach((m, i) => {
      const [x, y, yr, note] = m;
      s.appendChild(E("line", { x1: x, y1: BASE, x2: x, y2: BASE + 5, stroke: C.ink4, "stroke-width": 1 }));
      s.appendChild(T(x, BASE + 18, yr, { size: 9, fill: C.ink3, ls: 0.8, anchor: "middle" }));
      s.appendChild(E("circle", { cx: x, cy: y, r: 4.5, fill: C.blue, stroke: C.white, "stroke-width": 2, class: "viz-pop", style: "animation-delay:" + (0.9 + i * 0.18) + "s" }));
      if (note) s.appendChild(T(x, y - 12, note, { size: 8.5, fill: i === 2 ? C.blue : C.ink3, ls: 0.4, anchor: "middle", upper: false }));
    });
    host.appendChild(s);
  }

  /* ----------------------------------------------------------------- */
  /*  Intelligence core - every dimension ingested into one layer      */
  /* ----------------------------------------------------------------- */
  function renderCore(host) {
    const s = slice("0 0 900 600");
    const defs = E("defs");
    defs.appendChild(rgrad("coGlow", [["0", C.white, 0.95], ["0.18", C.cyan, 0.8], ["0.5", C.blue, 0.42], ["1", C.blue, 0]]));
    defs.appendChild(rgrad("coHalo", [["0", C.violet, 0], ["0.7", C.violet, 0.10], ["1", C.violet, 0]]));
    const soft = E("filter", { id: "coSoft", x: "-50%", y: "-50%", width: "200%", height: "200%" });
    soft.appendChild(E("feGaussianBlur", { stdDeviation: "1.4" })); defs.appendChild(soft);
    s.appendChild(defs);
    const cx = 450, cy = 300;

    s.appendChild(E("circle", { cx, cy, r: 250, fill: "url(#coHalo)" }));

    // instrument rings with tick marks
    [120, 180, 240].forEach((r, i) => {
      const g = E("g", { class: i % 2 ? "viz-orbit" : "viz-orbit-r", style: "animation-duration:" + (40 + i * 16) + "s" });
      g.appendChild(E("circle", { cx, cy, r, fill: "none", stroke: C.blue, "stroke-width": 1, opacity: (0.26 - i * 0.05).toFixed(2) }));
      const tg = E("g", { stroke: C.blue, "stroke-width": 1, opacity: (0.3 - i * 0.06).toFixed(2) });
      for (let a = 0; a < 360; a += 15) { const rad = (a * Math.PI) / 180; tg.appendChild(E("line", { x1: cx + Math.cos(rad) * r, y1: cy + Math.sin(rad) * r, x2: cx + Math.cos(rad) * (r + 5), y2: cy + Math.sin(rad) * (r + 5) })); }
      g.appendChild(tg);
      s.appendChild(g);
    });

    // four labeled dimensions feeding the core
    const feeds = [
      [150, 150, "Performance", "start"], [750, 150, "Market", "end"],
      [150, 450, "Brand", "start"], [750, 450, "History", "end"],
    ];
    const fg = E("g", { fill: "none", stroke: C.steel, "stroke-width": 1.2, opacity: 0.55 });
    feeds.forEach((f, i) => {
      const [x, y] = f;
      fg.appendChild(E("path", { d: "M " + x + " " + y + " Q " + ((x + cx) / 2) + " " + (y + (i < 2 ? 26 : -26)) + " " + cx + " " + cy, class: "viz-flow", "stroke-dasharray": "4 12", style: "animation-delay:" + (i * 0.3) + "s" }));
    });
    s.appendChild(fg);
    feeds.forEach((f) => {
      const [x, y, label, anchor] = f;
      s.appendChild(E("circle", { cx: x, cy: y, r: 5, fill: C.white, stroke: C.steel, "stroke-width": 1.5 }));
      s.appendChild(E("circle", { cx: x, cy: y, r: 2, fill: C.blue }));
      const lx = anchor === "end" ? x - 14 : x + 14;
      s.appendChild(T(lx, y + 4, label, { size: 13, fill: C.ink2, ls: 1.4, anchor }));
    });

    // living core
    s.appendChild(E("circle", { cx, cy, r: 92, fill: "url(#coGlow)", class: "viz-breathe" }));
    s.appendChild(E("circle", { cx, cy, r: 30, fill: "none", stroke: C.white, "stroke-width": 1.2, opacity: 0.6, class: "viz-pulse" }));
    s.appendChild(E("circle", { cx, cy, r: 15, fill: C.white }));
    host.appendChild(s);
  }

  /* ----------------------------------------------------------------- */
  const renderers = { ribbon: renderRibbon, signal: renderSignal, converge: renderConverge, compound: renderCompound, core: renderCore };
  function mount() {
    document.querySelectorAll("[data-viz]").forEach((host) => {
      const fn = renderers[host.getAttribute("data-viz")];
      if (fn && !host.dataset.vizDone) { fn(host); host.dataset.vizDone = "1"; }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
