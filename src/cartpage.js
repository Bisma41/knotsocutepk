/* /cart — the full-page cart. Same data as the drawer, more room. */
(function () {
  'use strict';

  const host = document.querySelector('[data-cart-page]');
  const aside = document.querySelector('[data-cart-summary]');
  const sum = document.querySelector('[data-sum]');
  if (!host) return;

  const cart = window.KSCcart, money = window.KSCmoney, esc = window.KSCesc;

  function render() {
    const lines = cart.detailed();

    if (!lines.length) {
      host.innerHTML =
        '<div class="empty"><div class="big">nothing in here yet.</div>' +
        '<p style="margin:14px 0 26px">Every piece is made to order, one at a time.</p>' +
        '<a class="btn" href="../shop">Browse the pieces</a></div>';
      if (aside) aside.hidden = true;
      return;
    }

    host.innerHTML = lines.map(function (l) {
      return '<div class="line" style="padding:22px 0;border-bottom:1px solid rgba(43,42,39,.12)">' +
        (l.image ? '<div class="line-shot"><img src="../' + l.image.src + '" alt=""></div>'
                 : '<div class="line-shot"></div>') +
        '<div>' +
          '<a class="line-name" href="../shop/' + l.slug + '">' + esc(l.name) + '</a>' +
          (l.colourway ? '<div class="line-var">' + esc(l.colourway) + '</div>' : '') +
          '<div class="line-price">' + money(l.price) + ' each</div>' +
          '<div class="line-qty">' +
            '<button type="button" data-act="dec" data-slug="' + l.slug + '" data-cw="' +
              esc(l.colourway) + '" aria-label="Reduce quantity of ' + esc(l.name) +
              '">&minus;</button>' +
            '<span class="n">' + l.qty + '</span>' +
            '<button type="button" data-act="inc" data-slug="' + l.slug + '" data-cw="' +
              esc(l.colourway) + '" aria-label="Increase quantity of ' + esc(l.name) + '"' +
              (l.qty >= 20 ? ' disabled' : '') + '>+</button>' +
            '<button class="line-rm" type="button" data-act="rm" data-slug="' + l.slug +
              '" data-cw="' + esc(l.colourway) + '">Remove</button>' +
          '</div>' +
        '</div>' +
        '<div class="line-price">' + money(l.lineTotal) + '</div>' +
      '</div>';
    }).join('');

    if (aside) aside.hidden = false;
    if (sum) {
      sum.innerHTML =
        '<div class="sum-row"><span class="lab">' +
          lines.reduce(function (n, l) { return n + l.qty; }, 0) + ' items</span><span>' +
          money(cart.subtotal()) + '</span></div>' +
        '<div class="sum-row"><span class="lab">Delivery</span>' +
          '<span>' + (cart.deliveryQuoted() ? 'confirmed separately' : 'at checkout') +
          '</span></div>' +
        '<div class="sum-row total"><span class="lab">Subtotal</span><span>' +
          money(cart.subtotal()) + '</span></div>';
    }
  }

  host.addEventListener('click', function (e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const slug = b.dataset.slug, cw = b.dataset.cw || '';
    const cur = cart.lines().find(function (l) {
      return l.slug === slug && (l.colourway || '') === cw;
    });
    if (!cur) return;
    if (b.dataset.act === 'inc') cart.setQty(slug, cw, cur.qty + 1);
    if (b.dataset.act === 'dec') cart.setQty(slug, cw, cur.qty - 1);
    if (b.dataset.act === 'rm') cart.remove(slug, cw);
    if (window.KSCannounce) window.KSCannounce();
  });

  document.addEventListener('ksc:cart', render);
  render();
})();
