/* =========================================================================
   STRATIS — interaction + motion engine
   Loader · kinetic type · scroll reveals · parallax · progress · nav · FAQ
   ========================================================================= */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer:fine)").matches;

  /* ----------------------------------------------------------------- */
  /*  Kinetic typography — split headlines into masked words           */
  /* ----------------------------------------------------------------- */
  function splitHeading(h) {
    if (h.classList.contains("kin")) return;
    const words = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    words.forEach((w, i) => {
      const word = document.createElement("span");
      word.className = "kin-word";
      const inner = document.createElement("span");
      inner.className = "kin-inner";
      inner.style.setProperty("--i", i);
      inner.textContent = w;
      word.appendChild(inner);
      h.appendChild(word);
      if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
    });
    h.classList.add("kin");
  }
  const headings = Array.from(document.querySelectorAll("h1, h2.display"));
  if (!reduce) headings.forEach(splitHeading);
  else headings.forEach((h) => h.classList.add("kin"));

  /* ----------------------------------------------------------------- */
  /*  Reveal + kinetic trigger via IntersectionObserver                */
  /* ----------------------------------------------------------------- */
  const revealTargets = document.querySelectorAll(".reveal");
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
        }),
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      )
    : null;

  const kinIO = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-in"); kinIO.unobserve(e.target); }
        }),
        { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
      )
    : null;

  // hero elements animate on load (handled later); everything else on scroll
  const hero = document.querySelector(".hero");
  function observeReveals() {
    revealTargets.forEach((el) => {
      if (hero && hero.contains(el)) return;          // hero handled by loader
      io ? io.observe(el) : el.classList.add("is-in");
    });
    headings.forEach((h) => {
      if (hero && hero.contains(h)) return;
      kinIO ? kinIO.observe(h) : h.classList.add("is-in");
    });
  }

  /* ----------------------------------------------------------------- */
  /*  Loader → hero intro choreography                                 */
  /* ----------------------------------------------------------------- */
  function playHeroIntro() {
    const seq = hero ? hero.querySelectorAll(".reveal") : [];
    seq.forEach((el, i) => setTimeout(() => el.classList.add("is-in"), 90 * i));
    const h1 = hero && hero.querySelector("h1");
    if (h1) setTimeout(() => h1.classList.add("is-in"), 120);
    document.getElementById("nav") && document.body.classList.add("nav--in");
  }

  const loader = document.getElementById("loader");
  function dismissLoader() {
    if (loader) loader.classList.add("is-done");
    document.body.style.overflow = "";
    playHeroIntro();
    observeReveals();
  }

  if (reduce) {
    if (loader) loader.remove();
    document.body.classList.add("nav--in");
    revealTargets.forEach((el) => el.classList.add("is-in"));
    headings.forEach((h) => h.classList.add("is-in"));
  } else if (loader) {
    document.body.style.overflow = "hidden";
    const seen = sessionStorage.getItem("stratis_seen");
    const wait = seen ? 350 : 1250;          // quick on repeat visits
    const start = performance.now();
    window.addEventListener("load", () => {
      const elapsed = performance.now() - start;
      setTimeout(dismissLoader, Math.max(0, wait - elapsed));
      sessionStorage.setItem("stratis_seen", "1");
    });
    // hard fallback
    setTimeout(dismissLoader, wait + 1400);
  } else {
    document.body.classList.add("nav--in");
    playHeroIntro();
    observeReveals();
  }

  /* ----------------------------------------------------------------- */
  /*  Sticky nav + scroll progress + parallax (single RAF loop)        */
  /* ----------------------------------------------------------------- */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("progress");
  // auto-register depth parallax on the visual surfaces (no markup needed)
  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  [[".cap__media", 0.07], [".how__media", 0.06], [".core__viz", 0.09]].forEach(([sel, sp]) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (!el.dataset.parallax) { el.dataset.parallax = sp; parallaxEls.push(el); }
    });
  });
  let ticking = false;

  function onFrame() {
    const y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("is-stuck", y > 8);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
    if (!reduce && parallaxEls.length) {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax) || 0.08;
        const mid = r.top + r.height / 2 - vh / 2;
        el.style.transform = "translate3d(0," + (-mid * speed).toFixed(1) + "px,0)";
      });
    }
    ticking = false;
  }
  function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } }
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame, { passive: true });
  onFrame();

  /* ----------------------------------------------------------------- */
  /*  Magnetic primary buttons                                         */
  /* ----------------------------------------------------------------- */
  if (finePointer && !reduce) {
    document.querySelectorAll(".btn--signal").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        btn.style.transform = "translate(" + mx * 0.22 + "px," + my * 0.32 + "px)";
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });
  }

  /* ----------------------------------------------------------------- */
  /*  Nav mega-menu (Akkio structure)                                  */
  /* ----------------------------------------------------------------- */
  const navMenu = document.getElementById("navMenu");
  const megawrap = document.getElementById("megawrap");
  const navScrim = document.getElementById("navScrim");
  if (navMenu && megawrap) {
    const items = Array.from(navMenu.querySelectorAll(".navitem"));
    const panels = Array.from(megawrap.querySelectorAll(".mega"));
    let openName = null, closeTimer = null;

    function open(name) {
      if (openName === name) return;
      clearTimeout(closeTimer);
      panels.forEach((p) => p.classList.toggle("is-open", p.dataset.panel === name));
      items.forEach((i) => {
        const ln = i.querySelector(".navlink");
        const on = ln.dataset.menu === name;
        i.classList.toggle("is-open", on);
        ln.setAttribute("aria-expanded", String(on));
      });
      document.body.classList.add("nav-open");
      openName = name;
    }
    function close() {
      clearTimeout(closeTimer);
      panels.forEach((p) => p.classList.remove("is-open"));
      items.forEach((i) => { i.classList.remove("is-open"); i.querySelector(".navlink").setAttribute("aria-expanded", "false"); });
      document.body.classList.remove("nav-open");
      openName = null;
    }
    const scheduleClose = () => { clearTimeout(closeTimer); closeTimer = setTimeout(close, 200); };
    const cancelClose = () => clearTimeout(closeTimer);

    items.forEach((item) => {
      const link = item.querySelector(".navlink");
      const name = link.dataset.menu;
      if (finePointer) item.addEventListener("mouseenter", () => open(name));
      link.addEventListener("click", (e) => { e.preventDefault(); openName === name ? close() : open(name); });
      link.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openName === name ? close() : open(name); } });
    });
    if (finePointer) {
      navMenu.addEventListener("mouseenter", cancelClose);
      navMenu.addEventListener("mouseleave", scheduleClose);
      panels.forEach((p) => { p.addEventListener("mouseenter", cancelClose); p.addEventListener("mouseleave", scheduleClose); });
    }
    document.addEventListener("click", (e) => { if (openName && !navMenu.contains(e.target) && !megawrap.contains(e.target)) close(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    window.addEventListener("scroll", () => { if (openName) close(); }, { passive: true });
    if (navScrim) navScrim.addEventListener("click", close);
    megawrap.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  }

  /* ----------------------------------------------------------------- */
  /*  Mobile menu                                                      */
  /* ----------------------------------------------------------------- */
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");
  if (toggle && menu) {
    const setOpen = (open) => {
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setOpen(!document.body.classList.contains("menu-open")));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  /* ----------------------------------------------------------------- */
  /*  FAQ accordion                                                    */
  /* ----------------------------------------------------------------- */
  document.querySelectorAll(".faq__item").forEach((item) => {
    const q = item.querySelector(".faq__q");
    const a = item.querySelector(".faq__a");
    q.addEventListener("click", () => {
      const open = item.classList.contains("is-open");
      item.parentElement.querySelectorAll(".faq__item.is-open").forEach((s) => {
        if (s !== item) { s.classList.remove("is-open"); s.querySelector(".faq__a").style.height = "0px"; }
      });
      if (open) { item.classList.remove("is-open"); a.style.height = "0px"; }
      else { item.classList.add("is-open"); a.style.height = a.scrollHeight + "px"; }
    });
  });
  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      document.querySelectorAll(".faq__item.is-open .faq__a").forEach((a) => { a.style.height = a.scrollHeight + "px"; });
    }, 120);
  });

  /* ----------------------------------------------------------------- */
  /*  Smooth in-page anchor scrolling                                  */
  /* ----------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        const t = document.querySelector(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }
      }
    });
  });
})();
