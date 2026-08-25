/* /checkout — validate, submit, and never lose an order. */
(function () {
  'use strict';

  const cart = window.KSCcart, money = window.KSCmoney, esc = window.KSCesc;
  const C = window.KSC_CATALOGUE || { settings: {} };
  const contact = (C.settings && C.settings.contact) || {};
  const hasWA = /^\d{8,15}$/.test(String(contact.whatsapp || '').trim());

  const form = document.getElementById('order-form');
  const wrap = document.querySelector('[data-checkout]');
  const emptyWarn = document.querySelector('[data-empty-warn]');
  const failBox = document.querySelector('[data-fail]');
  const linesBox = document.querySelector('[data-lines]');
  const sumBox = document.querySelector('[data-sum]');
  const submit = document.querySelector('[data-submit]');
  if (!form) return;

  /* One key per checkout attempt, so a double tap or a retry after a timeout
     cannot create two orders. Cleared only once an order really succeeds. */
  const IDEM = 'ksc_idem';
  function idemKey() {
    let k = sessionStorage.getItem(IDEM);
    if (!k) {
      k = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(IDEM, k);
    }
    return k;
  }

  const openedAt = Date.now();

  /* ---------------- summary ----------------------------------------- */
  function city() { return form.city.value.trim(); }

  function paint() {
    const lines = cart.detailed();
    if (!lines.length) {
      wrap.hidden = true;
      if (emptyWarn) emptyWarn.hidden = false;
      return;
    }
    wrap.hidden = false;
    if (emptyWarn) emptyWarn.hidden = true;

    linesBox.innerHTML = lines.map(function (l) {
      return '<div class="line" style="margin-bottom:16px">' +
        (l.image ? '<div class="line-shot"><img src="../' + l.image.src + '" alt=""></div>'
                 : '<div class="line-shot"></div>') +
        '<div><div class="line-name">' + esc(l.name) + '</div>' +
        (l.colourway ? '<div class="line-var">' + esc(l.colourway) + '</div>' : '') +
        '<div class="line-price">' + l.qty + ' &times; ' + money(l.price) + '</div></div>' +
        '<div class="line-price">' + money(l.lineTotal) + '</div></div>';
    }).join('');

    const del = cart.delivery(city());
    const c = city();
    sumBox.innerHTML =
      '<div class="sum-row"><span class="lab">Subtotal</span><span>' +
        money(cart.subtotal()) + '</span></div>' +
      '<div class="sum-row"><span class="lab">Delivery' +
        (c ? '' : ' <span style="opacity:.6">(enter your city)</span>') + '</span><span>' +
        (c ? (del === 0 ? 'Free' : money(del)) : '—') + '</span></div>' +
      '<div class="sum-row total"><span class="lab">Total</span><span>' +
        money(cart.subtotal() + (c ? del : 0)) + '</span></div>';
  }

  form.city.addEventListener('input', paint);
  // Autofill and datalist picks do not always fire 'input', and Safari can fill
  // fields after load, so recheck on change and once the page has settled.
  form.city.addEventListener('change', paint);
  form.addEventListener('focusout', paint);
  document.addEventListener('ksc:cart', paint);
  paint();
  setTimeout(paint, 600);

  /* ---------------- validation -------------------------------------- */
  function setErr(field, msg) {
    const el = form.querySelector('[name="' + field + '"]');
    const box = form.querySelector('[data-err="' + field + '"]');
    if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (box) { box.textContent = msg || ''; box.hidden = !msg; }
  }

  /* 03xxxxxxxxx, 3xxxxxxxxx, +923xxxxxxxxx, 00923xxxxxxxxx all normalise to
     92xxxxxxxxxx. Anything else is not a Pakistani mobile. */
  function normPhone(raw) {
    let d = String(raw || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (d.startsWith('0092')) d = d.slice(4);
    else if (d.startsWith('92')) d = d.slice(2);
    else if (d.startsWith('0')) d = d.slice(1);
    return /^3\d{9}$/.test(d) ? '92' + d : null;
  }

  const RULES = {
    name: function (v) {
      if (v.length < 2) return 'We need a name for the parcel.';
      if (!/[a-zA-Z؀-ۿ]/.test(v)) return 'That does not look like a name.';
      return '';
    },
    phone: function (v) {
      if (!v) return 'The courier needs a number to call.';
      return normPhone(v) ? '' : 'Use a Pakistani mobile, like 0300 1234567.';
    },
    email: function (v) {
      if (!v) return 'We send your receipt here.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'That email looks off.';
    },
    city: function (v) { return v.length < 2 ? 'Which city are we posting to?' : ''; },
    address: function (v) {
      if (v.length < 12) return 'A full address, please — house, street and area.';
      return '';
    }
  };

  Object.keys(RULES).forEach(function (f) {
    const el = form.querySelector('[name="' + f + '"]');
    if (!el) return;
    el.addEventListener('blur', function () { setErr(f, RULES[f](el.value.trim())); });
    el.addEventListener('input', function () {
      if (el.getAttribute('aria-invalid') === 'true') setErr(f, RULES[f](el.value.trim()));
    });
  });

  function validate() {
    let first = null;
    Object.keys(RULES).forEach(function (f) {
      const el = form.querySelector('[name="' + f + '"]');
      const msg = RULES[f](el.value.trim());
      setErr(f, msg);
      if (msg && !first) first = el;
    });
    const pay = form.querySelector('[name="payment"]:checked');
    setErr('payment', pay ? '' : 'Pick how you would like to pay.');
    if (!pay && !first) first = form.querySelector('[name="payment"]');
    return first;
  }

  /* ---------------- WhatsApp fallback ------------------------------- */
  function orderText(ref) {
    const lines = cart.detailed();
    return 'knotsocutepk order' + (ref ? ' ' + ref : '') + '\n\n' +
      lines.map(function (l) {
        return '• ' + l.qty + ' x ' + l.name + (l.colourway ? ' (' + l.colourway + ')' : '') +
          ' — ' + money(l.lineTotal);
      }).join('\n') +
      '\n\nSubtotal: ' + money(cart.subtotal()) +
      '\nDelivery: ' + money(cart.delivery(city())) +
      '\nTotal: ' + money(cart.total(city())) +
      '\n\nName: ' + form.name.value.trim() +
      '\nPhone: ' + form.phone.value.trim() +
      '\nEmail: ' + form.email.value.trim() +
      '\nCity: ' + city() +
      '\nAddress: ' + form.address.value.trim() +
      (form.notes.value.trim() ? '\nNotes: ' + form.notes.value.trim() : '') +
      '\nPayment: cash on delivery';
  }

  function failWith(msg) {
    const ref = 'KSC-TMP-' + Date.now().toString(36).toUpperCase();
    const href = hasWA
      ? 'https://wa.me/' + contact.whatsapp + '?text=' + encodeURIComponent(orderText(ref))
      : 'https://instagram.com/' + contact.instagram;
    failBox.innerHTML = esc(msg) + ' Your order is not lost — ' +
      '<a href="' + href + '" target="_blank" rel="noreferrer noopener"><strong>send it to us ' +
      'on ' + (hasWA ? 'WhatsApp' : 'Instagram') + '</strong></a>' +
      (hasWA ? ' (everything is already typed out for you)' : '') + ', or email ' +
      '<a href="mailto:' + esc(contact.email) + '">' + esc(contact.email) + '</a>. ' +
      'Reference ' + ref + '.';
    failBox.hidden = false;
    failBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    submit.disabled = false;
    submit.textContent = 'Place order';
  }

  /* ---------------- submit ------------------------------------------ */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    failBox.hidden = true;

    if (!cart.lines().length) { paint(); return; }

    const bad = validate();
    if (bad) {
      bad.focus();
      bad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Honeypot, plus a floor on how fast a human could fill this in.
    if (form.website.value || Date.now() - openedAt < 2500) {
      failWith('Something looked automated, so we did not send that.');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Placing your order…';

    const payload = {
      idempotencyKey: idemKey(),
      customer: {
        name: form.name.value.trim(),
        phone: normPhone(form.phone.value),
        phoneRaw: form.phone.value.trim(),
        email: form.email.value.trim(),
        city: city(),
        address: form.address.value.trim()
      },
      payment: (form.querySelector('[name="payment"]:checked') || {}).value || 'cod',
      notes: form.notes.value.trim(),
      // Server recomputes every figure from products.json. These are only
      // sent so the server can shout if the browser disagrees.
      items: cart.lines(),
      clientTotals: {
        subtotal: cart.subtotal(),
        delivery: cart.delivery(city()),
        total: cart.total(city())
      }
    };

    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
      })
      .then(function (res) {
        if (!res.ok || !res.body || !res.body.ok) {
          throw new Error((res.body && res.body.error) || 'Order failed');
        }
        // Success: clear the cart and the idempotency key, then confirm.
        sessionStorage.setItem('ksc_order', JSON.stringify({
          number: res.body.orderNumber,
          total: res.body.total,
          email: payload.customer.email
        }));
        sessionStorage.removeItem(IDEM);
        cart.clear();
        location.href = '../order/confirmed';
      })
      .catch(function (err) {
        failWith(/Failed to fetch|NetworkError/i.test(String(err && err.message))
          ? 'We could not reach our server — you may be offline.'
          : 'Something went wrong placing that order.');
      });
  });
})();
