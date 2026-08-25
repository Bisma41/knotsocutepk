#!/usr/bin/env node
/* ==========================================================================
   knotsocutepk — static site generator.

   Reads products.json and writes every page as plain HTML. No dependencies:
   Node's standard library only, so there is nothing to npm install and
   nothing that can break from a package update.

   Vercel runs this at deploy time (see buildCommand in vercel.json).
   You never need to run it locally — edit products.json, commit, done.

   Run manually with:  node build.js
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8'));
const P = DATA.products;
const S = DATA.settings;
const CONTACT = S.contact || {};
const SITE = (S.siteUrl || '').replace(/\/$/, '');

/* ------------------------------- helpers ------------------------------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK');

const hasWA = /^\d{8,15}$/.test(String(CONTACT.whatsapp || '').trim());
const waLink = (text) => hasWA
  ? 'https://wa.me/' + CONTACT.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '')
  : 'https://instagram.com/' + CONTACT.instagram;
const igLink = 'https://instagram.com/' + CONTACT.instagram;

/* 'quoted' delivery: nothing is charged at checkout because the cost depends on
   distance. It is agreed on WhatsApp and collected with the COD cash. */
const DELIVERY_QUOTED = ((S.delivery && S.delivery.mode) || 'flat') === 'quoted';

function write(rel, html) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html.trim() + '\n', 'utf8');
  console.log('  ' + rel + '  (' + Math.round(Buffer.byteLength(html) / 1024) + ' KB)');
}

const CATS = [
  { key: 'all', label: 'Everything' },
  { key: 'bags', label: 'Bags' },
  { key: 'charms', label: 'Charms' },
  { key: 'flowers', label: 'Flowers' }
];

/* ------------------------------- layout -------------------------------- */
/* depth = how many directories deep the page is, so relative asset paths
   resolve. Pages live at /, /shop/, /shop/<slug>/, /order/confirmed/ ...   */
function layout(o) {
  const up = '../'.repeat(o.depth || 0) || './';
  const abs = (p) => SITE + '/' + p.replace(/^\//, '');
  const ogImg = abs(o.ogImage || 'images/cat-bags.jpg');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<meta name="theme-color" content="#FAF4EC">
<link rel="canonical" href="${abs(o.canonical || '')}">
${o.noindex ? '<meta name="robots" content="noindex">' : ''}

<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="knotsocutepk">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${abs(o.canonical || '')}">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:alt" content="${esc(o.ogAlt || 'Handmade crochet by knotsocutepk')}">
<meta property="og:locale" content="en_PK">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.ogTitle || o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${ogImg}">

<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&amp;family=Jost:wght@300;400;500&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}src/site.css">
${o.head || ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="grain" aria-hidden="true"></div>
${o.progress ? '<div class="progress" id="progress" aria-hidden="true"></div>' : ''}

<header class="site-header${o.solidHeader ? ' solid' : ''}">
  <nav aria-label="Main">
    <a class="brand" href="${up}">knotsocutepk</a>
    <div class="navlinks">
      <a href="${up}shop">Shop</a>
      <a href="${up}#story" data-opt>Story</a>
      <a href="${igLink}" target="_blank" rel="noreferrer noopener" data-opt>Instagram</a>
      <button class="cart-btn" type="button" data-open-cart data-cart-label>
        Cart <span class="cart-count" data-cart-count data-empty="1">0</span>
      </button>
    </div>
  </nav>
</header>

<main id="main">
${o.body}
</main>

<footer class="site-footer">
  <div class="foot-top">
    <div class="foot-tag">your wardrobe staple,<br>now in crochet.</div>
    <div class="foot-cols">
      <div class="foot-col">
        <span class="h">Shop</span>
        <a href="${up}shop">All pieces</a>
        <a href="${up}shop?c=bags">Bags</a>
        <a href="${up}shop?c=charms">Charms</a>
      </div>
      <div class="foot-col">
        <span class="h">Help</span>
        <a href="${up}policies">Delivery &amp; returns</a>
        <a href="${up}cart">Your cart</a>
      </div>
      <div class="foot-col">
        <span class="h">Contact</span>
        <a href="${igLink}" target="_blank" rel="noreferrer noopener">@${esc(CONTACT.instagram)}</a>
        <a href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a>
        ${hasWA ? `<a href="${waLink()}" target="_blank" rel="noreferrer noopener">WhatsApp</a>` : ''}
      </div>
    </div>
  </div>
  <div class="wordmark" aria-hidden="true">knotsocutepk</div>
  <div class="foot-legal">
    <span>&copy; 2026 knotsocutepk</span><span>handmade in pakistan</span>
  </div>
</footer>

${o.jsonld ? `<script type="application/ld+json">\n${JSON.stringify(o.jsonld, null, 1)}\n</script>` : ''}
<script src="${up}catalogue.js"></script>
<script src="${up}src/shop.js" defer></script>
${o.scripts || ''}
</body>
</html>`;
}

/* --------------------------- product card ----------------------------- */
/* i is the position in the grid. The first two are above the fold on a phone,
   so they load eagerly — lazy-loading the largest visible image delays LCP. */
function card(p, up, i) {
  const img = p.images[0];
  const eager = typeof i === 'number' && i < 2;
  return `<a class="card" href="${up}shop/${p.slug}" data-cat="${p.category}">
  <div class="card-shot">
    <img src="${up}${img.src}" alt="${esc(img.alt)}" width="${img.w}" height="${img.h}"
         ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}${img.pos ? ` style="object-position:${img.pos}"` : ''}>
    ${p.available === false ? '<span class="card-sold">sold out</span>' : ''}
  </div>
  <div class="card-meta">
    <span class="card-name">${esc(p.name)}</span>
    <span class="card-price">${money(p.price)}</span>
  </div>
  <span class="card-tag">${esc(p.tag)}</span>
</a>`;
}

/* ================================ HOME ================================ */
function home() {
  const facts = `<dl class="facts fade d6">
    <div class="fact"><dt>Made to order</dt><dd>Ready in ${S.leadTimeDays} days</dd></div>
    <div class="fact"><dt>Colourways</dt><dd>One of one, never restocked</dd></div>
    <div class="fact"><dt>Enquiries</dt>
      <dd><a class="underline" href="${hasWA ? waLink() : igLink}" target="_blank"
             rel="noreferrer noopener">${hasWA ? 'WhatsApp us' : 'DM @' + esc(CONTACT.instagram)}</a></dd></div>
  </dl>`;

  const pieces = P.map((p, i) => {
    const multi = p.images.length > 1;
    const shots = p.images.map((im, j) => {
      const contain = im.fit === 'contain';
      return `<div class="shot${j === 0 ? ' on' : ''}${contain ? ' shot-contain' : ''}">
        ${contain ? `<img class="shot-fill" src="${im.src}" alt="" aria-hidden="true" width="${im.w}" height="${im.h}" loading="lazy" decoding="async">` : ''}
        <img src="${im.src}" alt="${esc(im.alt)}" width="${im.w}" height="${im.h}"
             loading="lazy" decoding="async"${im.pos ? ` style="object-position:${im.pos}"` : ''}>
      </div>`;
    }).join('\n');

    return `<article class="piece" style="background:${p.tint};top:calc(clamp(76px,12vh,120px) + ${i * 16}px)">
  <div class="piece-txt">
    <div class="piece-meta"><span>${p.idx} / ${String(P.length).padStart(2, '0')}</span><span>${esc(p.tag)}</span></div>
    <div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.blurb)}</p>
      <div class="piece-buy">
        <span class="price">${money(p.price)}</span>
        <a class="enquire" href="shop/${p.slug}">View piece &rarr;</a>
      </div>
    </div>
  </div>
  <div class="shots"${multi ? ' data-gallery' : ''}>
${shots}
  </div>
</article>`;
  }).join('\n\n');

  const body = `
<section class="hero" id="top">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="rule-row fade d1">
    <span class="k">drop 01 — live now</span>
    <span class="line" aria-hidden="true"></span>
    <span class="m">handmade in lahore</span>
    <span class="line" aria-hidden="true"></span>
    <span class="m">${String(P.length).padStart(2, '0')} pieces · from ${money(Math.min(...P.map(x => x.price)))}</span>
  </div>

  <div class="hero-grid">
    <div class="hero-copy">
      <h1>
        <span class="clip"><span class="rise d2">knots so</span></span>
        <span class="clip"><span class="rise it d3">cute it hurts</span></span>
      </h1>
      <p class="lede fade d4">Crochet bags, charms and small obsessions — looped by hand, in
        batches you can count on two hands.</p>
      <div class="cta-row fade d5">
        <a class="btn" href="shop">Shop the pieces</a>
        <a class="btn-ghost" href="#waitlist">Join the waitlist</a>
      </div>
    </div>
    <div class="collage">
      <div class="tile tile-tall">
        <img src="images/hero-tall.jpg" alt="A hand-crocheted bag resting on a table"
             width="1100" height="1450" fetchpriority="high" decoding="async">
      </div>
      <div class="tile-row">
        <div class="tile tile-a">
          <img src="images/hero-small-a.jpg" alt="A crochet bow keychain in pink yarn"
               width="900" height="700" decoding="async">
        </div>
        <div class="tile tile-b">
          <img src="images/hero-small-b.jpg" alt="Crochet flowers in soft green and cream"
               width="900" height="700" decoding="async">
        </div>
      </div>
    </div>
  </div>
  ${facts}
</section>

<section class="manifesto">
  <h2 class="wipe">Nothing here was made twice. Every bag, every charm, every knot — one pair
    of hands, one skein, one evening at a time.</h2>
</section>

<section class="pieces" id="pieces">
  <div class="sec-head reveal">
    <h2>the <em>pieces</em></h2>
    <span class="hint">05 — scroll to stack</span>
  </div>
${pieces}
</section>

<section class="story" id="story">
  <div class="story-grid">
    <div class="story-copy">
      <div class="eyebrow">02 — the story</div>
      <h2>every stitch is<br><em>somebody's hands.</em></h2>
      <p>One hook, one skein, a very small table. Everything is still made that way — at home,
        in Pakistan. No factory, no second run, no restock of a colourway once the yarn is gone.</p>
      <dl class="stats">
        <div><dt>100%</dt><dd>hand-looped</dd></div>
        <div><dt>1 of 1</dt><dd>colourways</dd></div>
        <div><dt>${S.leadTimeDays} days</dt><dd>made to order</dd></div>
      </dl>
    </div>
    <div class="story-imgs">
      <div class="story-img si-1 reveal"><img src="images/story-hands.jpg"
        alt="Hands crocheting with a hook and cream yarn" width="1000" height="1250" loading="lazy" decoding="async"></div>
      <div class="story-img si-2 reveal"><img src="images/story-bag.jpg"
        alt="A finished crochet bag on a small table" width="900" height="900" loading="lazy" decoding="async"></div>
      <div class="story-img si-3 reveal"><img src="images/story-yarn.jpg"
        alt="Skeins of yarn in soft colours" width="1100" height="733" loading="lazy" decoding="async"></div>
    </div>
  </div>
</section>

<section class="cats">
  <div class="cats-row reveal">
    <a class="cat cat-lg" href="shop?c=bags">
      <img src="images/cat-bags.jpg" alt="A collection of handmade crochet bags"
           width="1000" height="1200" loading="lazy" decoding="async">
      <span class="cat-inner"><span class="name">Bags</span><span class="num">01 — shop</span></span>
    </a>
    <div class="cat-col">
      <a class="cat cat-sm" href="shop?c=charms">
        <img src="images/cat-charms.jpg" alt="Crochet charms and keychains"
             width="1000" height="660" loading="lazy" decoding="async">
        <span class="cat-inner"><span class="name">Charms</span><span class="num">02 — shop</span></span>
      </a>
      <a class="cat-dark" href="#waitlist">
        <span class="num">03 — next drop</span>
        <span class="name">Join the list &rarr;</span>
      </a>
    </div>
  </div>
</section>

<section class="waitlist" id="waitlist">
  <div class="waitlist-in reveal">
    <div class="eyebrow">04 — the list</div>
    <h2>the hype <em>is real.</em></h2>
    <form class="wl-form" id="wl-form" novalidate>
      <label><span class="lab">Name</span>
        <input type="text" name="name" id="wl-name" placeholder="first name"
               autocomplete="given-name" required maxlength="80"></label>
      <label><span class="lab">Email</span>
        <input type="email" name="email" id="wl-email" placeholder="you@email.com"
               autocomplete="email" required maxlength="120"></label>
      <button class="wl-btn" type="submit" id="wl-btn">Join the list</button>
      <p class="wl-note" id="wl-note" role="status" aria-live="polite"></p>
    </form>
    <div class="wl-done" id="wl-done" hidden>
      <div class="big">you're on the list.</div>
      <div class="sub">We'll email the moment drop 02 goes live.</div>
    </div>
  </div>
</section>

<section class="ugc">
  <div class="ugc-head reveal">
    <h2>follow the knots</h2>
    <a href="${igLink}" target="_blank" rel="noreferrer noopener">@${esc(CONTACT.instagram)} &rarr;</a>
  </div>
  <div class="ugc-grid reveal">
${['ugc-1', 'ugc-2', 'ugc-7', 'ugc-4', 'ugc-5', 'ugc-6'].map(u =>
  `    <a href="${igLink}" target="_blank" rel="noreferrer noopener"><img src="images/${u}.jpg"
      alt="Customer photo of a knotsocutepk crochet piece" width="700" height="700"
      loading="lazy" decoding="async"></a>`).join('\n')}
  </div>
</section>`;

  write('index.html', layout({
    depth: 0,
    progress: true,
    title: 'knotsocutepk — handmade crochet bags & charms, Lahore',
    description: 'Handmade crochet bags, keychains and charms, looped by hand in Lahore. ' +
      'Made to order, ready in ' + S.leadTimeDays + ' days. One-of-one colourways from ' +
      money(Math.min(...P.map(x => x.price))) + '.',
    ogTitle: 'knots so cute it hurts',
    canonical: '',
    ogImage: 'images/cat-bags.jpg',
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'knotsocutepk',
      description: 'Handmade crochet bags, keychains and charms, looped by hand in Lahore.',
      url: SITE + '/',
      image: SITE + '/images/cat-bags.jpg',
      email: CONTACT.email,
      sameAs: [igLink],
      address: { '@type': 'PostalAddress', addressLocality: 'Lahore', addressCountry: 'PK' },
      priceRange: money(Math.min(...P.map(x => x.price))) + ' - ' + money(Math.max(...P.map(x => x.price)))
    },
    scripts: '<script src="src/home.js" defer></script>'
  }));
}

/* ================================ SHOP ================================ */
function shop() {
  const body = `
<div class="page page-narrow">
  <div class="page-head">
    <h1>the <em>pieces</em></h1>
    <p class="sub">Every piece is made to order, one at a time, and finished in
      ${S.leadTimeDays} days. Colourways are one of one — once the yarn is gone it does
      not come back.</p>
  </div>

  <div class="filters js-only" role="group" aria-label="Filter by category">
${CATS.map(c => `    <button class="filter" type="button" data-filter="${c.key}"
      aria-pressed="${c.key === 'all' ? 'true' : 'false'}">${c.label}</button>`).join('\n')}
  </div>

  <div class="grid" data-grid>
${P.map((p, i) => card(p, '../', i)).join('\n')}
    <p class="grid-empty" data-grid-empty hidden>Nothing in this category yet.</p>
  </div>
</div>`;

  write('shop/index.html', layout({
    depth: 1,
    solidHeader: true,
    title: 'Shop all pieces — knotsocutepk',
    description: 'All ' + P.length + ' handmade crochet pieces — bags, charms and flowers, ' +
      'made to order in Lahore from ' + money(Math.min(...P.map(x => x.price))) + '.',
    canonical: 'shop',
    ogImage: 'images/cat-bags.jpg',
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'knotsocutepk — all pieces',
      numberOfItems: P.length,
      itemListElement: P.map((p, i) => ({
        '@type': 'ListItem', position: i + 1, url: SITE + '/shop/' + p.slug, name: p.name
      }))
    },
    scripts: '<script src="../src/shopfilter.js" defer></script>'
  }));
}

/* ============================ PRODUCT PAGE ============================ */
function pdp(p) {
  const main = p.images[0];
  const multi = p.images.length > 1;
  const related = P.filter(x => x.slug !== p.slug)
    .sort((a, b) => (a.category === p.category ? -1 : 1) - (b.category === p.category ? -1 : 1))
    .slice(0, 3);

  const gallery = `<div class="pdp-main${main.fit === 'contain' ? ' contain' : ''}" data-pdp-main>
    ${main.fit === 'contain' ? `<img class="pdp-blur" src="../../${main.src}" alt="" aria-hidden="true" width="${main.w}" height="${main.h}" decoding="async">` : ''}
    <img src="../../${main.src}" alt="${esc(main.alt)}" width="${main.w}" height="${main.h}"
         fetchpriority="high" decoding="async"${main.pos ? ` style="object-position:${main.pos}"` : ''}>
  </div>
  ${multi ? `<div class="pdp-thumbs js-only" role="group" aria-label="Photos of ${esc(p.name)}">
${p.images.map((im, i) => `    <button class="pdp-thumb" type="button" data-i="${i}"
      aria-current="${i === 0 ? 'true' : 'false'}"
      aria-label="Show photo ${i + 1} of ${p.images.length}"><img src="../../${im.src}"
      alt="" width="66" height="66" loading="lazy" decoding="async"></button>`).join('\n')}
  </div>` : ''}`;

  const colour = p.colourways && p.colourways.length ? `
    <div class="field">
      <span class="field-lab">Colourway${p.colourwaysStatus === 'REVIEW' ? '' : ''}</span>
      <div class="swatches" role="group" aria-label="Choose a colourway" data-swatches>
${p.colourways.map((c, i) => `        <button class="swatch" type="button" data-cw="${esc(c)}"
          aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(c)}</button>`).join('\n')}
      </div>
    </div>` : '';

  const body = `
<div class="page page-narrow">
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="../../">Home</a> / <a href="../">Shop</a> / ${esc(p.name)}
  </nav>

  <div class="pdp">
    <div class="pdp-media">
${gallery}
    </div>

    <div class="pdp-info" data-product="${p.slug}">
      <div class="pdp-tag">${p.idx} / ${String(P.length).padStart(2, '0')} &nbsp;·&nbsp; ${esc(p.tag)}</div>
      <h1>${esc(p.name)}</h1>
      <p class="pdp-price">${money(p.price)}</p>
      <p class="pdp-desc">${esc(p.description)}</p>

      <hr class="pdp-rule">
${colour}
      <div class="field js-only">
        <span class="field-lab" id="qty-lab-${p.slug}">Quantity</span>
        <div class="stepper">
          <button type="button" data-qty="-1" aria-label="Reduce quantity">&minus;</button>
          <input type="number" value="1" min="1" max="20" inputmode="numeric"
                 aria-labelledby="qty-lab-${p.slug}" data-qty-input>
          <button type="button" data-qty="1" aria-label="Increase quantity">+</button>
        </div>
      </div>

      <button class="btn-add js-only" type="button" data-add
        ${p.available === false ? 'disabled' : ''}>
        ${p.available === false ? 'Sold out' : 'Add to cart'}
      </button>

      <p class="nojs-only nojs-dm">To order, message us on
        <a href="${waLink('Hi knotsocutepk! I would like to order the ' + p.name + ' (' + money(p.price) + ').')}"
           target="_blank" rel="noreferrer noopener">${hasWA ? 'WhatsApp' : 'Instagram'}</a>.
        ${hasWA ? 'Our number is ' + esc(CONTACT.whatsapp) + '.' : ''}</p>

      <dl class="pdp-facts">
        <div><dt>Made to order</dt><dd>Ready in ${S.leadTimeDays} days, then posted</dd></div>
        <div><dt>Delivery</dt><dd>${DELIVERY_QUOTED
          ? 'Depends on distance —<br>confirmed on WhatsApp'
          : money(S.delivery.lahore) + ' in Lahore<br>' + money(S.delivery.restOfPakistan) + ' elsewhere'}</dd></div>
        <div><dt>Payment</dt><dd>Cash on delivery</dd></div>
      </dl>
    </div>
  </div>

  <section class="related">
    <div class="sec-head"><h2>you might also <em>like</em></h2></div>
    <div class="grid">
${related.map(r => card(r, '../../')).join('\n')}
    </div>
  </section>
</div>`;

  write('shop/' + p.slug + '/index.html', layout({
    depth: 2,
    solidHeader: true,
    title: p.name + ' — ' + p.tag + ' — knotsocutepk',
    description: p.blurb + ' ' + money(p.price) + ', handmade to order in Lahore, ready in ' +
      S.leadTimeDays + ' days.',
    ogTitle: p.name + ' — ' + money(p.price),
    canonical: 'shop/' + p.slug,
    ogImage: main.src,
    ogAlt: main.alt,
    ogType: 'product',
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: 'KSC-' + p.idx,
      category: p.tag,
      description: p.description,
      image: p.images.map(im => SITE + '/' + im.src),
      brand: { '@type': 'Brand', name: 'knotsocutepk' },
      offers: {
        '@type': 'Offer',
        url: SITE + '/shop/' + p.slug,
        price: p.price,
        priceCurrency: 'PKR',
        availability: p.available === false
          ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition'
      }
    },
    scripts: '<script src="../../src/pdp.js" defer></script>'
  }));
}

/* ================================ CART ================================ */
function cart() {
  const body = `
<div class="page page-narrow">
  <div class="page-head"><h1>your <em>cart</em></h1></div>
  <div class="checkout-grid">
    <div data-cart-page>
      <p class="empty">Loading your cart…</p>
    </div>
    <aside class="summary" data-cart-summary hidden>
      <h2>summary</h2>
      <div class="sum-rows" data-sum></div>
      <a class="btn-add" href="../checkout" style="text-align:center;text-decoration:none;
        display:block;margin-top:22px">Checkout</a>
      <p class="hint" style="text-align:center;margin-top:14px">Delivery is calculated at
        checkout from your city.</p>
    </aside>
  </div>
</div>`;

  write('cart/index.html', layout({
    depth: 1, solidHeader: true, noindex: true,
    title: 'Your cart — knotsocutepk',
    description: 'Review the pieces in your cart before checking out.',
    canonical: 'cart', body,
    scripts: '<script src="../src/cartpage.js" defer></script>'
  }));
}

/* ============================== CHECKOUT ============================== */
function checkout() {
  const pay = [];
  if (S.payment.cod) pay.push({
    v: 'cod', t: 'Cash on delivery',
    d: 'Pay the courier in cash when your parcel arrives. Nothing to pay now.'
  });
  if (S.payment.bankTransfer) pay.push({
    v: 'bank', t: 'Bank transfer',
    d: 'We will send account details after you place the order.'
  });
  if (S.payment.jazzcash) pay.push({
    v: 'jazzcash', t: 'JazzCash', d: 'We will send the number after you place the order.'
  });
  if (S.payment.easypaisa) pay.push({
    v: 'easypaisa', t: 'Easypaisa', d: 'We will send the number after you place the order.'
  });

  const body = `
<div class="page page-narrow">
  <div class="page-head"><h1>check <em>out</em></h1></div>

  <div class="notice" data-empty-warn hidden>
    Your cart is empty. <a href="../shop">Have a look at the pieces</a> first.
  </div>
  <div class="notice bad" data-fail hidden></div>

  <div class="checkout-grid" data-checkout hidden>
    <form id="order-form" novalidate>
      <div class="form-grid">
        <div class="wide">
          <label class="inp-lab" for="f-name">Full name</label>
          <input class="inp" id="f-name" name="name" type="text" autocomplete="name"
                 required maxlength="90">
          <span class="err-msg" data-err="name" hidden></span>
        </div>

        <div>
          <label class="inp-lab" for="f-phone">Phone (WhatsApp)</label>
          <input class="inp" id="f-phone" name="phone" type="tel" inputmode="numeric"
                 autocomplete="tel" placeholder="0300 1234567" required maxlength="20">
          <span class="hint">The courier calls this number before delivering.</span>
          <span class="err-msg" data-err="phone" hidden></span>
        </div>

        <div>
          <label class="inp-lab" for="f-email">Email</label>
          <input class="inp" id="f-email" name="email" type="email" inputmode="email"
                 autocomplete="email" placeholder="you@email.com" required maxlength="120">
          <span class="hint">For your receipt.</span>
          <span class="err-msg" data-err="email" hidden></span>
        </div>

        <div>
          <label class="inp-lab" for="f-city">City</label>
          <input class="inp" id="f-city" name="city" type="text" autocomplete="address-level2"
                 list="pk-cities" required maxlength="60">
          <datalist id="pk-cities">
            <option>Lahore</option><option>Karachi</option><option>Islamabad</option>
            <option>Rawalpindi</option><option>Faisalabad</option><option>Multan</option>
            <option>Peshawar</option><option>Quetta</option><option>Sialkot</option>
            <option>Gujranwala</option><option>Hyderabad</option><option>Bahawalpur</option>
          </datalist>
          <span class="err-msg" data-err="city" hidden></span>
        </div>

        <div class="wide">
          <label class="inp-lab" for="f-addr">Delivery address</label>
          <textarea class="inp" id="f-addr" name="address" autocomplete="street-address"
                    required maxlength="400" placeholder="House / flat, street, area, landmark"></textarea>
          <span class="err-msg" data-err="address" hidden></span>
        </div>

        <div class="wide">
          <span class="inp-lab">Payment</span>
          <div class="pay-opts">
${pay.map((m, i) => `            <label class="pay">
              <input type="radio" name="payment" value="${m.v}" ${i === 0 ? 'checked' : ''}>
              <span><span class="t">${esc(m.t)}</span><span class="d">${esc(m.d)}</span></span>
            </label>`).join('\n')}
          </div>
          <span class="err-msg" data-err="payment" hidden></span>
        </div>

        <div class="wide">
          <label class="inp-lab" for="f-notes">Order notes <span style="text-transform:none;
            letter-spacing:0">(optional)</span></label>
          <textarea class="inp" id="f-notes" name="notes" maxlength="400"
            placeholder="Gift wrap, a colour you had in mind, anything else"></textarea>
        </div>

        <!-- spam trap: real people never fill this in -->
        <div class="wide" aria-hidden="true"
             style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
          <label for="f-website">Website</label>
          <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>
      </div>

      <button class="btn-add" type="submit" data-submit style="margin-top:28px">
        Place order
      </button>
      <p class="hint" style="text-align:center;margin-top:14px">
        No payment is taken on this site. You pay the courier in cash on delivery.</p>
    </form>

    <aside class="summary">
      <h2>your order</h2>
      <div data-lines></div>
      <div class="sum-rows" data-sum></div>
    </aside>
  </div>
</div>`;

  write('checkout/index.html', layout({
    depth: 1, solidHeader: true, noindex: true,
    title: 'Checkout — knotsocutepk',
    description: 'Place your order for handmade crochet, delivered across Pakistan.',
    canonical: 'checkout', body,
    scripts: '<script src="../src/checkout.js" defer></script>'
  }));
}

/* ============================= CONFIRMED ============================== */
function confirmed() {
  const body = `
<div class="page">
  <div class="confirmed">
    <div class="eyebrow" style="opacity:.6">order received</div>
    <h1>thank you, <em>truly.</em></h1>
    <p class="num" data-order-num>&mdash;</p>

    <ol class="steps">
      <li><span class="n">01</span><span>We have your order and a copy is on its way to your
        inbox. Check spam if it is not there in a few minutes.</span></li>
      <li><span class="n">02</span><span>Your piece gets made by hand. That takes about
        ${S.leadTimeDays} days — every one is started from scratch.</span></li>
      ${DELIVERY_QUOTED ? `<li><span class="n">03</span><span>We message you the delivery
        charge for your address and confirm it with you before posting.</span></li>
      <li><span class="n">04</span><span>We hand it to ${esc(CONTACT.courier)} and send you the
        tracking number.</span></li>
      <li><span class="n">05</span><span>Pay the courier in cash when it arrives — the pieces
        and the delivery together.</span></li>`
      : `<li><span class="n">03</span><span>We hand it to ${esc(CONTACT.courier)} and message you
        the tracking number.</span></li>
      <li><span class="n">04</span><span>Pay the courier in cash when it arrives.</span></li>`}
    </ol>

    <p style="font-size:14px;color:var(--muted);line-height:1.7">Anything to change — an
      address, a colourway, a second thought — message us
      <a class="underline" href="${waLink()}" target="_blank" rel="noreferrer noopener"
         data-wa-link>${hasWA ? 'on WhatsApp' : 'on Instagram'}</a> and quote your order
      number.</p>

    <a class="btn" href="../../shop" style="display:inline-block;margin-top:34px">
      Back to the shop</a>
  </div>
</div>`;

  write('order/confirmed/index.html', layout({
    depth: 2, solidHeader: true, noindex: true,
    title: 'Order received — knotsocutepk',
    description: 'Your order has been received.',
    canonical: 'order/confirmed', body,
    scripts: '<script src="../../src/confirmed.js" defer></script>'
  }));
}

/* ============================== POLICIES ============================== */
function policies() {
  const d = S.delivery;
  const body = `
<div class="page page-narrow">
  <div class="page-head">
    <h1>delivery &amp; <em>returns</em></h1>
    <p class="sub">How made-to-order works, what postage costs, and what happens if
      something is wrong.</p>
  </div>

  <div class="prose">
    <p><strong style="font-weight:500">Please review this page before launch.</strong>
      Passages marked <span class="review">like this</span> are drafts — I do not know your
      actual terms, and this page is a promise to your customers.</p>

    <h2>How <em>made to order</em> works</h2>
    <p>Nothing here sits in a box waiting. When you order, that piece gets started from
      scratch — one hook, one skein, at a small table in Lahore. That takes about
      ${S.leadTimeDays} days before it is handed to the courier.</p>
    <p>Colourways are one of one. Once a yarn is finished it does not come back, so a
      colour you saw last month may not be available now. If the exact shade you picked has
      run out, we message you before making anything.</p>

    <h2>Delivery</h2>
    ${DELIVERY_QUOTED ? `<p>Delivery is charged on top of the prices you see, and it depends on
      how far the parcel has to travel. Nothing for delivery is added at checkout — once your
      order is in, we work out the charge for your address and
      <strong style="font-weight:500">confirm it with you on WhatsApp before we post
      anything</strong>. You will never be surprised by it at the door.</p>
    <p>You then pay for the pieces and the delivery together, in cash, when the parcel
      arrives.</p>`
    : `<ul>
      <li>Lahore — ${money(d.lahore)}</li>
      <li>Anywhere else in Pakistan — ${money(d.restOfPakistan)}</li>
      ${d.freeOver ? `<li>Free over ${money(d.freeOver)}</li>` : ''}
    </ul>`}
    <p>Parcels go by ${esc(CONTACT.courier)}. Add roughly
      <span class="review">2 to 4 working days</span> on top of the making time, depending
      on your city. You get a tracking number as soon as it ships.</p>
    <p>We deliver across Pakistan only. <span class="review">International shipping is not
      available yet — message us if you want it and we will quote you.</span></p>

    <h2>Paying</h2>
    <p>Cash on delivery. Nothing is taken on this website, and we never ask for card details
      or a bank PIN over WhatsApp. You hand the cash to the courier when your parcel
      arrives.</p>
    <p>Please be there to receive it. Because every piece is made for one person, a refused
      parcel means the yarn and the hours are already spent.
      <span class="review">Repeatedly refused deliveries may mean we ask for advance payment
      next time.</span></p>

    <h2>If something is <em>wrong</em></h2>
    <p>If your piece arrives damaged, or it is not what you ordered, message us within
      <span class="review">48 hours</span> of delivery with a photo and we will replace it or
      refund you.</p>
    <p><span class="review">Because every piece is made to order for one person, we cannot
      accept returns simply because you changed your mind.</span> If something is not right,
      talk to us — we would much rather fix it than have you stuck with something you do not
      love.</p>
    <p>Handmade means small variations in stitch and shade are normal, and are not
      defects. Each one is made by a person, not a machine.</p>

    <h2>Looking after it</h2>
    <p>Hand wash cold, gently, and dry flat away from direct sun. Do not wring or tumble
      dry — crochet stretches when it is wet and will not spring back.</p>

    <h2>Reaching us</h2>
    <p>Message <a class="underline" href="${igLink}" target="_blank"
      rel="noreferrer noopener">@${esc(CONTACT.instagram)}</a>${hasWA
      ? ` or <a class="underline" href="${waLink()}" target="_blank" rel="noreferrer noopener">WhatsApp us</a>`
      : ''}, or email
      <a class="underline" href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a>.
      We reply <span class="review">within a day, usually sooner</span>.</p>
  </div>
</div>`;

  write('policies/index.html', layout({
    depth: 1, solidHeader: true,
    title: 'Delivery & returns — knotsocutepk',
    description: 'Delivery charges across Pakistan, how made-to-order works, cash on ' +
      'delivery, and what to do if something is wrong.',
    canonical: 'policies', body
  }));
}

/* ============================== CATALOGUE ============================= */
/* Only what the browser needs — the client never sees anything else. */
function catalogue() {
  const payload = {
    settings: {
      leadTimeDays: S.leadTimeDays,
      delivery: S.delivery,
      payment: S.payment,
      contact: { whatsapp: CONTACT.whatsapp, instagram: CONTACT.instagram, email: CONTACT.email }
    },
    products: P.map(p => ({
      slug: p.slug, name: p.name, tag: p.tag, price: p.price, category: p.category,
      available: p.available !== false, colourways: p.colourways || [],
      images: [{ src: p.images[0].src }]
    }))
  };
  write('catalogue.js', '/* GENERATED by build.js from products.json — do not edit. */\n' +
    'window.KSC_CATALOGUE=' + JSON.stringify(payload) + ';');
}

/* ================================ RUN ================================= */
function sitemap() {
  const urls = ['', 'shop', 'policies'].concat(P.map(p => 'shop/' + p.slug));
  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url><loc>' + SITE + '/' + u + '</loc>' +
      '<priority>' + (u === '' ? '1.0' : u.startsWith('shop/') ? '0.8' : '0.6') +
      '</priority></url>').join('\n') +
    '\n</urlset>');
}

console.log('building knotsocutepk — ' + P.length + ' products');

// Fail the build loudly rather than shipping a page with a missing photo.
let missing = [];
P.forEach(p => p.images.forEach(im => {
  if (!fs.existsSync(path.join(ROOT, im.src))) missing.push(p.slug + ' -> ' + im.src);
}));
if (missing.length) {
  console.error('\nBUILD FAILED — these images are referenced but do not exist:');
  missing.forEach(m => console.error('  ' + m));
  process.exit(1);
}

const slugs = new Set();
P.forEach(p => {
  if (slugs.has(p.slug)) { console.error('BUILD FAILED — duplicate slug: ' + p.slug); process.exit(1); }
  slugs.add(p.slug);
  if (!/^[a-z0-9-]+$/.test(p.slug)) {
    console.error('BUILD FAILED — slug must be lowercase letters, numbers and dashes: ' + p.slug);
    process.exit(1);
  }
});

catalogue();
home();
shop();
P.forEach(pdp);
cart();
checkout();
confirmed();
policies();
sitemap();

const review = P.filter(p => p.colourwaysStatus === 'REVIEW').map(p => p.slug);
console.log('\ndone — ' + (P.length + 7) + ' files');
if (review.length) {
  console.log('\nNOTE: guessed colourways still marked REVIEW in products.json:');
  console.log('  ' + review.join(', '));
}
if (!hasWA) console.log('NOTE: no WhatsApp number set — enquiry links fall back to Instagram.');
