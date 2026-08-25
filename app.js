/* ==========================================================================
   knotsocutepk — site behaviour
   --------------------------------------------------------------------------
   EVERYTHING YOU NEED TO EDIT IS IN THE CONFIG BLOCK DIRECTLY BELOW.
   Nothing further down needs touching.
   ========================================================================== */

const CONFIG = {

  /* --- 1. WhatsApp number for order enquiries ----------------------------
     Country code first, digits only. No +, no spaces, no dashes.
     A Pakistani mobile 0300 1234567 becomes '923001234567'
     (92 = Pakistan, then the number without its leading 0).

     Leave it as '' and every Enquire button falls back to Instagram DM,
     so the site still works until you fill this in.                        */
  whatsapp: '',

  /* --- 2. Instagram handle (no @) --------------------------------------- */
  instagram: 'knotsocutepk',

  /* --- 3. Waitlist -> Google Sheet --------------------------------------
     Paste the Google Apps Script Web App URL here. It looks like:
     https://script.google.com/macros/s/AKfycb..../exec
     Setup steps are in SETUP.md.

     Leave it as '' and the form falls back to opening the visitor's email
     app addressed to you, so no signup is ever lost.                       */
  sheetEndpoint: '',

  /* --- 4. Fallback email (used if sheetEndpoint is empty) --------------- */
  email: 'notsocutepk@gmail.com',

  /* --- 5. Members-only follow gate -------------------------------------
     false = everyone sees the shop straight away  (recommended)
     true  = visitors must open Instagram and wait before entering        */
  followGate: false,

  /* Seconds a visitor must spend on Instagram before the gate unlocks.
     Only used when followGate is true.                                    */
  gateSeconds: 8,
};

/* ==========================================================================
   Nothing below here needs editing.
   ========================================================================== */
(function () {
  'use strict';

  const igUrl = 'https://instagram.com/' + CONFIG.instagram;
  const hasWA = /^\d{8,15}$/.test(String(CONFIG.whatsapp || '').trim());

  /* ---------- Enquire buttons -> WhatsApp (or Instagram DM) ------------- */
  function enquiryUrl(name, price) {
    if (hasWA) {
      const msg = 'Hi knotsocutepk! I\'d like to order the ' + name + ' (' + price + '). ' +
                  'Is it available?';
      return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg);
    }
    return igUrl;
  }

  document.querySelectorAll('.piece').forEach(function (card) {
    const name = card.dataset.name || 'this piece';
    const price = card.dataset.price || '';
    const btn = card.querySelector('.enquire');
    if (!btn) return;

    // Swap the button for a real link so it can be opened in a new tab,
    // copied, or long-pressed like any other link.
    const a = document.createElement('a');
    a.className = 'enquire';
    a.href = enquiryUrl(name, price);
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
    a.textContent = hasWA ? 'Enquire on WhatsApp →' : 'Enquire →';
    a.setAttribute('aria-label', 'Enquire about ' + name + ', ' + price);
    btn.replaceWith(a);
  });

  // Footer + hero contact links
  if (hasWA) {
    const waHref = 'https://wa.me/' + CONFIG.whatsapp;
    const foot = document.getElementById('foot-wa');
    if (foot) { foot.href = waHref; foot.textContent = 'WhatsApp'; }
    const dm = document.getElementById('hero-dm');
    if (dm) { dm.href = waHref; dm.textContent = 'WhatsApp us'; }
  } else {
    const foot = document.getElementById('foot-wa');
    if (foot) foot.remove();   // don't show a WhatsApp link that isn't one
  }

  /* ---------- Product galleries: hover on desktop, swipe/tap on touch --- */
  document.querySelectorAll('[data-gallery]').forEach(function (gal) {
    const shots = Array.from(gal.querySelectorAll('.shot'));
    const n = shots.length;
    if (n < 2) return;

    let cur = 0;
    const dots = document.createElement('div');
    dots.className = 'dots';
    shots.forEach(function (_, i) {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'dot' + (i === 0 ? ' on' : '');
      d.setAttribute('aria-label', 'View photo ' + (i + 1) + ' of ' + n);
      d.addEventListener('click', function (e) { e.preventDefault(); show(i); });
      dots.appendChild(d);
    });

    const hint = document.createElement('span');
    hint.className = 'swipe-hint';
    hint.textContent = (window.matchMedia('(hover:hover)').matches ? 'hover to browse — ' :
                        'swipe to browse — ') + n + ' shots';

    gal.appendChild(dots);
    gal.appendChild(hint);

    function show(i) {
      i = Math.max(0, Math.min(n - 1, i));
      if (i === cur) return;
      shots[cur].classList.remove('on');
      dots.children[cur].classList.remove('on');
      shots[i].classList.add('on');
      dots.children[i].classList.add('on');
      cur = i;
    }

    // Desktop: horizontal mouse position picks the shot (as designed)
    if (window.matchMedia('(hover:hover)').matches) {
      gal.addEventListener('mousemove', function (e) {
        const r = gal.getBoundingClientRect();
        show(Math.floor(((e.clientX - r.left) / r.width) * n));
      });
      gal.addEventListener('mouseleave', function () { show(0); });
    }

    // Touch: horizontal swipe. Vertical drags stay as page scroll.
    let x0 = null, y0 = null;
    gal.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    gal.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
      x0 = y0 = null;
    }, { passive: true });
  });

  /* ---------- Waitlist -> Google Sheet --------------------------------- */
  const form = document.getElementById('wl-form');
  if (form) {
    const note = document.getElementById('wl-note');
    const btn = document.getElementById('wl-btn');
    const done = document.getElementById('wl-done');

    function say(msg, isErr) {
      note.textContent = msg;
      note.classList.toggle('err', !!isErr);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();

      if (!name) { say('Pop your first name in first.', true); form.name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        say('That email looks off — mind checking it?', true); form.email.focus(); return;
      }

      // No endpoint configured yet: hand off to the visitor's email app so
      // the signup reaches you regardless.
      if (!CONFIG.sheetEndpoint) {
        const sub = encodeURIComponent('Waitlist: ' + name);
        const body = encodeURIComponent('Name: ' + name + '\nEmail: ' + email +
                                        '\n\nAdd me to the drop 02 waitlist!');
        window.location.href = 'mailto:' + CONFIG.email + '?subject=' + sub + '&body=' + body;
        form.hidden = true;
        done.hidden = false;
        return;
      }

      btn.disabled = true;
      say('Adding you…');

      const payload = JSON.stringify({
        name: name,
        email: email,
        source: location.hostname,
        at: new Date().toISOString()
      });

      function win() { form.hidden = true; done.hidden = false; }

      // text/plain keeps this a CORS "simple request", so no preflight is
      // needed — Apps Script cannot answer an OPTIONS probe.
      fetch(CONFIG.sheetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(win)
        .catch(function () {
          // Apps Script does not always echo an Access-Control-Allow-Origin
          // header. When it doesn't, the POST still ARRIVES — we just can't
          // read the reply. Resend opaquely so the signup is never lost.
          fetch(CONFIG.sheetEndpoint, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload
          })
            .then(win)
            .catch(function () {
              btn.disabled = false;
              say('That didn\'t go through. Try again, or DM us on Instagram.', true);
            });
        });
    });
  }

  /* ---------- Scroll progress bar -------------------------------------- */
  const bar = document.getElementById('progress');
  if (bar) {
    let queued = false;
    const draw = function () {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
      queued = false;
    };
    addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(draw); }
    }, { passive: true });
    draw();
  }

  /* ---------- Reveal on scroll (works in every browser) ---------------- */
  const targets = document.querySelectorAll('.reveal, .wipe');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Optional follow gate ------------------------------------- */
  if (CONFIG.followGate) {
    const gate = document.getElementById('gate');
    const follow = document.getElementById('gate-follow');
    const enter = document.getElementById('gate-enter');
    const gnote = document.getElementById('gate-note');
    const KEY = 'knot_gate_v3';
    const need = Math.max(3, CONFIG.gateSeconds | 0);

    let clicked = false, away = 0, leftAt = null, timer = null;

    function passed() {
      try {
        if (sessionStorage.getItem(KEY) !== '1') return false;
        const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
        return !!(raw && raw.t && Date.now() - raw.t < 24 * 3600e3);
      } catch (e) { return false; }
    }

    function open() {
      gate.hidden = false;
      document.body.classList.add('is-locked');
      follow.focus();
    }
    function close() {
      gate.hidden = true;
      document.body.classList.remove('is-locked');
      if (timer) { clearInterval(timer); timer = null; }
    }

    function paint() {
      const live = leftAt ? Math.round((Date.now() - leftAt) / 1000) : 0;
      const total = away + live;
      const ready = clicked && total >= need;
      enter.disabled = !ready;
      enter.textContent = ready ? 'Enter the shop'
        : clicked ? 'Hold on — ' + Math.max(0, need - total) + 's'
                  : 'Open Instagram to unlock';
      gnote.textContent = ready ? 'Welcome in — the whole drop is yours.'
        : clicked ? 'Take a look, then come back to this tab.'
                  : 'Already following? Open the profile anyway — it only takes a moment.';
    }

    if (!passed()) {
      open();
      follow.href = igUrl;
      follow.addEventListener('click', function () {
        clicked = true;
        if (!timer) timer = setInterval(paint, 500);
        paint();
      });
      document.addEventListener('visibilitychange', function () {
        if (!clicked) return;
        if (document.hidden) { leftAt = Date.now(); return; }
        if (leftAt) { away += Math.round((Date.now() - leftAt) / 1000); leftAt = null; }
        paint();
      });
      enter.addEventListener('click', function () {
        if (enter.disabled) return;
        try {
          localStorage.setItem(KEY, JSON.stringify({ t: Date.now() }));
          sessionStorage.setItem(KEY, '1');
        } catch (e) {}
        close();
      });
      paint();
    }
  }
})();
