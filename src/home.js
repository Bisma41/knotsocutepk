/* Home page only: the stacked-piece photo galleries and the waitlist form.
   Cart, reveals and the progress bar live in shop.js. */
(function () {
  'use strict';

  const C = window.KSC_CATALOGUE || { settings: {} };
  const contact = (C.settings && C.settings.contact) || {};

  /* ---------- piece galleries: hover on desktop, swipe on touch ------- */
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

    const hover = window.matchMedia('(hover:hover)').matches;
    const hint = document.createElement('span');
    hint.className = 'swipe-hint';
    hint.textContent = (hover ? 'hover to browse — ' : 'swipe to browse — ') + n + ' shots';

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

    if (hover) {
      gal.addEventListener('mousemove', function (e) {
        const r = gal.getBoundingClientRect();
        show(Math.floor(((e.clientX - r.left) / r.width) * n));
      });
      gal.addEventListener('mouseleave', function () { show(0); });
    }

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

  /* ---------- waitlist ---------------------------------------------- */
  const form = document.getElementById('wl-form');
  if (!form) return;

  const note = document.getElementById('wl-note');
  const btn = document.getElementById('wl-btn');
  const done = document.getElementById('wl-done');
  const ENDPOINT = window.KSC_WAITLIST_ENDPOINT || '';

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

    if (!ENDPOINT) {
      const sub = encodeURIComponent('Waitlist: ' + name);
      const body = encodeURIComponent('Name: ' + name + '\nEmail: ' + email +
        '\n\nAdd me to the drop 02 waitlist!');
      window.location.href = 'mailto:' + contact.email + '?subject=' + sub + '&body=' + body;
      form.hidden = true; done.hidden = false;
      return;
    }

    btn.disabled = true;
    say('Adding you…');

    const payload = JSON.stringify({
      name: name, email: email, source: location.hostname, at: new Date().toISOString()
    });
    const win = function () { form.hidden = true; done.hidden = false; };

    fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(win)
      .catch(function () {
        // Apps Script does not always send an Access-Control-Allow-Origin header.
        // The POST still arrives; resend opaquely so a signup is never lost.
        fetch(ENDPOINT, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload
        }).then(win).catch(function () {
          btn.disabled = false;
          say('That didn\'t go through. Try again, or DM us on Instagram.', true);
        });
      });
  });
})();
