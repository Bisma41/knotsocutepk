/* Product page: photo switcher, colourway picker, quantity, add to cart. */
(function () {
  'use strict';

  const info = document.querySelector('[data-product]');
  if (!info) return;
  const slug = info.dataset.product;

  const C = window.KSC_CATALOGUE || { products: [] };
  const product = (C.products || []).find(function (p) { return p.slug === slug; });

  /* ---------- photo switcher ---------------------------------------- */
  const main = document.querySelector('[data-pdp-main]');
  const thumbs = Array.from(document.querySelectorAll('.pdp-thumb'));
  if (main && thumbs.length) {
    const shot = main.querySelector('img:not(.pdp-blur)');
    const blur = main.querySelector('.pdp-blur');
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () {
        const src = t.querySelector('img').getAttribute('src');
        shot.setAttribute('src', src);
        shot.removeAttribute('style');       // per-image object-position only fits photo 1
        if (blur) blur.setAttribute('src', src);
        thumbs.forEach(function (o) {
          o.setAttribute('aria-current', o === t ? 'true' : 'false');
        });
      });
    });
  }

  /* ---------- colourway --------------------------------------------- */
  const swatches = Array.from(document.querySelectorAll('[data-swatches] .swatch'));
  let colourway = swatches.length ? swatches[0].dataset.cw : '';
  swatches.forEach(function (s) {
    s.addEventListener('click', function () {
      colourway = s.dataset.cw;
      swatches.forEach(function (o) {
        o.setAttribute('aria-pressed', o === s ? 'true' : 'false');
      });
    });
  });

  /* ---------- quantity ---------------------------------------------- */
  const qtyInput = document.querySelector('[data-qty-input]');
  function qty() {
    const n = parseInt(qtyInput && qtyInput.value, 10);
    return Math.min(20, Math.max(1, isNaN(n) ? 1 : n));
  }
  function setQty(n) {
    if (!qtyInput) return;
    qtyInput.value = Math.min(20, Math.max(1, n));
    document.querySelectorAll('[data-qty]').forEach(function (b) {
      const dir = parseInt(b.dataset.qty, 10);
      b.disabled = (dir < 0 && qty() <= 1) || (dir > 0 && qty() >= 20);
    });
  }
  document.querySelectorAll('[data-qty]').forEach(function (b) {
    b.addEventListener('click', function () { setQty(qty() + parseInt(b.dataset.qty, 10)); });
  });
  if (qtyInput) {
    qtyInput.addEventListener('change', function () { setQty(qty()); });
    setQty(1);
  }

  /* ---------- add to cart ------------------------------------------- */
  const add = document.querySelector('[data-add]');
  if (!add || add.disabled) return;

  add.addEventListener('click', function () {
    const ok = window.KSCcart.add(slug, colourway, qty());
    if (!ok) {
      add.textContent = 'Pick a colourway first';
      setTimeout(function () { add.textContent = 'Add to cart'; }, 2200);
      return;
    }
    if (window.KSCannounce) {
      window.KSCannounce((product ? product.name : 'Item') + ' added to your cart.');
    }
    window.KSCdrawer.open();
    setQty(1);
  });
})();
