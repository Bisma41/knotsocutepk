/* /shop — category filter. Cards are already in the HTML; this only hides them,
   so the page is complete and indexable with JavaScript switched off. */
(function () {
  'use strict';

  const btns = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('.grid [data-cat]'));
  const empty = document.querySelector('[data-grid-empty]');
  if (!btns.length || !cards.length) return;

  function apply(key, push) {
    let shown = 0;
    cards.forEach(function (c) {
      const on = key === 'all' || c.dataset.cat === key;
      c.hidden = !on;
      if (on) shown++;
    });
    btns.forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.filter === key ? 'true' : 'false');
    });
    if (empty) empty.hidden = shown > 0;

    if (push) {
      const u = new URL(location.href);
      if (key === 'all') u.searchParams.delete('c');
      else u.searchParams.set('c', key);
      history.replaceState(null, '', u);
    }
    if (window.KSCannounce) {
      window.KSCannounce(shown + (shown === 1 ? ' piece' : ' pieces') + ' shown.');
    }
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () { apply(b.dataset.filter, true); });
  });

  // Deep links from the home page: /shop?c=bags
  const want = new URL(location.href).searchParams.get('c');
  if (want && btns.some(function (b) { return b.dataset.filter === want; })) apply(want, false);
})();
