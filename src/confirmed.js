/* /order/confirmed — shows the order number the server assigned. */
(function () {
  'use strict';

  const numEl = document.querySelector('[data-order-num]');
  const waEl = document.querySelector('[data-wa-link]');
  if (!numEl) return;

  let order = null;
  try { order = JSON.parse(sessionStorage.getItem('ksc_order') || 'null'); } catch (e) {}

  if (!order || !order.number) {
    // Landed here directly, or reloaded much later. Don't invent a number.
    numEl.textContent = '';
    const h = document.querySelector('.confirmed h1');
    if (h) h.innerHTML = 'nothing to show <em>here.</em>';
    const steps = document.querySelector('.steps');
    if (steps) {
      steps.innerHTML = '<li><span class="n">—</span><span>We could not find a recent order ' +
        'in this browser. If you have just ordered, check your email for the receipt — ' +
        'your order is safe. Otherwise, start again from the shop.</span></li>';
    }
    return;
  }

  numEl.textContent = order.number;
  document.title = 'Order ' + order.number + ' — knotsocutepk';

  const total = document.createElement('p');
  total.style.cssText = 'font-size:14px;color:var(--muted);margin:-10px 0 0';
  total.textContent = 'Total ' + window.KSCmoney(order.total) +
    ', payable in cash on delivery.' + (order.email ? ' Receipt sent to ' + order.email + '.' : '');
  numEl.insertAdjacentElement('afterend', total);

  if (waEl) {
    const base = waEl.getAttribute('href') || '';
    if (base.indexOf('wa.me') > -1) {
      waEl.setAttribute('href', base.split('?')[0] + '?text=' +
        encodeURIComponent('Hi! About my order ' + order.number + ' — '));
    }
  }
})();
