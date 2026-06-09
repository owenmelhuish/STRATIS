/* ============================================================================
   STRATIS — form modals (self-contained, drop-in)
   --------------------------------------------------------------------------
   Include once per page:  <script src="js/modals.js" defer></script>

   Triggers (add to any element, e.g. <a href="#" data-demo-open>Book a demo</a>):
     data-demo-open      -> "Book a demo" modal
     data-contact-open   -> "Contact" modal (larger message field)
   Optional label on a trigger: data-modal-source="Enterprise hero"

   Both submit via FormSubmit AJAX to owen@stratis.technology (primary) and
   CC kyle@stratis.technology. No backend, no dependencies, no CSS file.
   Styling mirrors the Advisory "request a seat" modal.
   ========================================================================== */
(function () {
  "use strict";
  if (window.__stratisModals) return;            // guard against double-include
  window.__stratisModals = true;

  var ENDPOINT = "https://formsubmit.co/ajax/owen@stratis.technology";
  var CC = "kyle@stratis.technology";
  var EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  var FALLBACK = "hello@stratis.technology";     // shown only if a submission fails

  /* ---- shared styles, injected once. Hardcoded values so this works on every
          page regardless of which stylesheet it loads (home/pages/styles.css). ---- */
  var css = [
    '.sfm{position:fixed;inset:0;z-index:4000;display:none;align-items:center;justify-content:center;padding:20px;font-family:"Inter",ui-sans-serif,system-ui,sans-serif}',
    '.sfm.is-open{display:flex}',
    '.sfm__scrim{position:absolute;inset:0;background:rgba(20,28,45,0.16);-webkit-backdrop-filter:blur(14px) saturate(120%);backdrop-filter:blur(14px) saturate(120%);opacity:0;transition:opacity .4s ' + EASE + '}',
    '.sfm.is-open .sfm__scrim{opacity:1}',
    '.sfm__card{position:relative;z-index:1;width:min(520px,100%);max-height:calc(100vh - 40px);overflow:auto;border-radius:30px;padding:clamp(24px,4vw,42px);background:rgba(255,255,255,0.82);-webkit-backdrop-filter:blur(26px) saturate(160%);backdrop-filter:blur(26px) saturate(160%);border:1px solid rgba(255,255,255,0.7);box-shadow:inset 0 0 0 1px rgba(30,50,90,0.06),0 50px 110px -34px rgba(30,50,90,0.35);transform:translateY(16px) scale(.98);opacity:0;transition:opacity .45s ' + EASE + ',transform .45s ' + EASE + '}',
    '.sfm.is-open .sfm__card{transform:none;opacity:1}',
    '.sfm__close{position:absolute;top:18px;right:18px;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(30,50,90,0.06);border:1px solid rgba(30,50,90,0.08);color:#2A2E36;cursor:pointer;transition:background .3s ' + EASE + '}',
    '.sfm__close:hover{background:rgba(30,50,90,0.12)}',
    '.sfm__close svg{width:18px;height:18px}',
    '.sfm-title{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:500;font-size:1.5rem;letter-spacing:-0.01em;color:#2A2E36;margin:0}',
    '.sfm-sub{font-size:0.92rem;line-height:1.5;color:#5E6470;margin:8px 0 0}',
    '.sfm-form{display:flex;flex-direction:column;gap:14px;margin-top:20px}',
    '.sfm-field{width:100%;height:58px;border-radius:16px;padding:0 22px;font-family:inherit;font-size:1rem;color:#2A2E36;background:rgba(255,255,255,0.65);border:1px solid rgba(30,50,90,0.12);outline:none;transition:border-color .3s ' + EASE + ',background .3s ' + EASE + ',box-shadow .3s ' + EASE + '}',
    '.sfm textarea.sfm-field{height:auto;min-height:96px;padding:16px 22px;resize:vertical;line-height:1.5}',
    '.sfm--lg textarea.sfm-field{min-height:200px}',
    '.sfm-field::placeholder{color:#8A8F98}',
    '.sfm-field:focus{border-color:rgba(30,50,90,0.28);background:#fff;box-shadow:0 0 0 3px rgba(30,50,90,0.06)}',
    '.sfm-submit{height:60px;border-radius:16px;margin-top:8px;font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:500;font-size:1.05rem;letter-spacing:0.06em;color:#fff;background:#2A2E36;border:1px solid #2A2E36;cursor:pointer;transition:background .3s ' + EASE + ',transform .3s ' + EASE + ',box-shadow .3s ' + EASE + '}',
    '.sfm-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 14px 32px -16px rgba(20,23,29,0.5)}',
    '.sfm-submit:disabled{opacity:.5;cursor:default}',
    '.sfm-hp{position:absolute !important;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none}',
    '.sfm-msg{margin:4px 2px 0;min-height:1.2em;font-size:.9rem;line-height:1.4;color:#5E6470;text-align:center}',
    '.sfm-msg--ok{color:#0e9b86;font-weight:600}',
    '.sfm-msg--err{color:#c0392b}',
    'body.sfm-open{overflow:hidden}'
  ].join("\n");

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---- modal factory ----
     cfg: { id, trigger, large, title, sub, subject, submitLabel,
            msgPlaceholder, requireMessage } */
  function buildModal(cfg) {
    var root = document.createElement("div");
    root.className = "sfm" + (cfg.large ? " sfm--lg" : "");
    root.id = cfg.id;
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="sfm__scrim" data-modal-close></div>' +
      '<div class="sfm__card" role="dialog" aria-modal="true" aria-label="' + esc(cfg.title) + '">' +
        '<button class="sfm__close" type="button" data-modal-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
        '<h2 class="sfm-title">' + esc(cfg.title) + '</h2>' +
        '<p class="sfm-sub">' + esc(cfg.sub) + '</p>' +
        '<form class="sfm-form" novalidate>' +
          '<input type="hidden" name="_subject" value="' + esc(cfg.subject) + '">' +
          '<input type="hidden" name="_cc" value="' + CC + '">' +
          '<input type="hidden" name="_template" value="table">' +
          '<input type="hidden" name="_captcha" value="false">' +
          '<input type="hidden" name="source" value="">' +
          '<input type="text" name="_honey" class="sfm-hp" tabindex="-1" autocomplete="off">' +
          '<input class="sfm-field" type="text" name="name" placeholder="Name" autocomplete="name" required>' +
          '<input class="sfm-field" type="text" name="company" placeholder="Company" autocomplete="organization">' +
          '<input class="sfm-field" type="email" name="email" placeholder="Work email" autocomplete="email" required>' +
          '<textarea class="sfm-field" name="message" placeholder="' + esc(cfg.msgPlaceholder) + '"' + (cfg.requireMessage ? " required" : "") + '></textarea>' +
          '<button class="sfm-submit" type="submit">' + esc(cfg.submitLabel) + '</button>' +
          '<p class="sfm-msg" role="status" aria-live="polite"></p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(root);

    var form = root.querySelector("form");
    var msg = root.querySelector(".sfm-msg");
    var sourceInput = form.querySelector('input[name="source"]');
    var lastFocus = null;

    function open(e) {
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      var label = (e && e.currentTarget && e.currentTarget.getAttribute("data-modal-source")) || "";
      sourceInput.value = (document.title || location.pathname) + (label ? " — " + label : "");
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
      msg.className = "sfm-msg"; msg.textContent = "";
      root.classList.add("is-open"); root.setAttribute("aria-hidden", "false");
      document.body.classList.add("sfm-open");
      var f = root.querySelector(".sfm-field");
      if (f) setTimeout(function () { f.focus(); }, 80);
    }
    function close() {
      root.classList.remove("is-open"); root.setAttribute("aria-hidden", "true");
      document.body.classList.remove("sfm-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.querySelectorAll("[" + cfg.trigger + "]").forEach(function (el) {
      el.addEventListener("click", open);
    });
    root.querySelectorAll("[data-modal-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("is-open")) close();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector(".sfm-submit");
      var name = form.name.value.trim(), email = form.email.value.trim();
      var message = form.message.value.trim();
      if (!name || !email || (cfg.requireMessage && !message)) {
        msg.className = "sfm-msg sfm-msg--err";
        msg.textContent = cfg.requireMessage
          ? "Please add your name, email and a message."
          : "Please add your name and email.";
        return;
      }
      msg.className = "sfm-msg"; msg.textContent = "Sending…"; btn.disabled = true;
      var data = Object.fromEntries(new FormData(form).entries());
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.success === true || j.success === "true") {
            msg.className = "sfm-msg sfm-msg--ok";
            msg.textContent = "Thank you. Your message has been sent. We'll be in touch.";
            form.reset();
            setTimeout(close, 2400);
          } else {
            msg.className = "sfm-msg sfm-msg--err";
            msg.textContent = (j.message || "Something went wrong.") + " Please email " + FALLBACK + ".";
          }
        })
        .catch(function () {
          msg.className = "sfm-msg sfm-msg--err";
          msg.textContent = "Network error. Please email " + FALLBACK + ".";
        })
        .finally(function () { btn.disabled = false; });
    });
  }

  function init() {
    var style = document.createElement("style");
    style.id = "sfmStyles";
    style.textContent = css;
    document.head.appendChild(style);

    buildModal({
      id: "demoModal",
      trigger: "data-demo-open",
      large: false,
      title: "Book a demo",
      sub: "Tell us where to reach you and we'll set up a walkthrough of STRATIS.",
      subject: "New STRATIS demo request",
      submitLabel: "Request demo",
      msgPlaceholder: "Anything specific you'd like to see? (optional)",
      requireMessage: false
    });

    buildModal({
      id: "contactModal",
      trigger: "data-contact-open",
      large: true,
      title: "Get in touch",
      sub: "Send us a note and the STRATIS team will get back to you.",
      subject: "New STRATIS contact request",
      submitLabel: "Send message",
      msgPlaceholder: "How can we help?",
      requireMessage: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
