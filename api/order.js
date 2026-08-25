/* ==========================================================================
   POST /api/order

   The only trusted place prices are calculated. The browser sends slugs and
   quantities; every rupee is recomputed here from products.json, so a customer
   editing localStorage cannot change what they owe.

   Forwards the finished order to Google Apps Script, which assigns the order
   number under a lock and sends both emails.

   Needs one Vercel environment variable:
     ORDER_SHEET_URL   the Apps Script /exec URL   (Settings -> Environment Variables)
   ========================================================================== */
'use strict';

const DATA = require('../products.json');
const PRODUCTS = DATA.products;
const S = DATA.settings;

const bySlug = Object.create(null);
PRODUCTS.forEach((p) => { bySlug[p.slug] = p; });

const MAX_QTY = 20;
const MAX_LINES = 30;

/* Very small in-memory throttle. Serverless instances are recycled, so this
   only blunts a burst from one address — it is not a real rate limiter. */
const hits = new Map();
function throttled(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  rec.n++;
  hits.set(ip, rec);
  if (hits.size > 500) hits.clear();
  return rec.n > 8;
}

const money = (n) => 'PKR ' + Number(n).toLocaleString('en-PK');

function bad(res, code, error) {
  return res.status(code).json({ ok: false, error });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return bad(res, 405, 'Use POST.');
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (throttled(ip)) return bad(res, 429, 'Too many attempts. Give it a minute.');

  /* ---------------- parse ------------------------------------------- */
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return bad(res, 400, 'Malformed request.'); }
  }
  if (!body || typeof body !== 'object') return bad(res, 400, 'Malformed request.');

  const c = body.customer || {};
  const items = Array.isArray(body.items) ? body.items : [];

  /* ---------------- validate customer ------------------------------- */
  const name = String(c.name || '').trim().slice(0, 90);
  const email = String(c.email || '').trim().slice(0, 120);
  const city = String(c.city || '').trim().slice(0, 60);
  const address = String(c.address || '').trim().slice(0, 400);
  const notes = String(body.notes || '').trim().slice(0, 400);

  let phone = String(c.phone || '').replace(/[^\d]/g, '');
  if (/^0?3\d{9}$/.test(phone)) phone = '92' + phone.replace(/^0/, '');
  if (!/^923\d{9}$/.test(phone)) return bad(res, 400, 'That phone number is not a Pakistani mobile.');

  if (name.length < 2) return bad(res, 400, 'A name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad(res, 400, 'A valid email is required.');
  if (city.length < 2) return bad(res, 400, 'A city is required.');
  if (address.length < 12) return bad(res, 400, 'A full delivery address is required.');

  /* ---------------- validate payment method ------------------------- */
  const allowed = Object.keys(S.payment).filter((k) => S.payment[k]);
  const methodMap = { cod: 'cod', bank: 'bankTransfer', jazzcash: 'jazzcash', easypaisa: 'easypaisa' };
  const method = String(body.payment || 'cod');
  if (!methodMap[method] || !allowed.includes(methodMap[method])) {
    return bad(res, 400, 'That payment method is not available.');
  }

  /* ---------------- rebuild the order from source ------------------- */
  if (!items.length) return bad(res, 400, 'Your cart is empty.');
  if (items.length > MAX_LINES) return bad(res, 400, 'Too many separate items.');

  const lines = [];
  let subtotal = 0;

  for (const raw of items) {
    const p = bySlug[String(raw && raw.slug)];
    if (!p) return bad(res, 400, 'One of those pieces no longer exists.');
    if (p.available === false) return bad(res, 409, p.name + ' has sold out.');

    const qty = Math.floor(Number(raw.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      return bad(res, 400, 'Invalid quantity for ' + p.name + '.');
    }

    const cw = String(raw.colourway || '').trim();
    const opts = p.colourways || [];
    if (opts.length && !opts.includes(cw)) {
      return bad(res, 400, 'Pick a colourway for ' + p.name + '.');
    }
    if (!opts.length && cw) return bad(res, 400, 'Unexpected colourway for ' + p.name + '.');

    const lineTotal = p.price * qty;      // price comes from source, never the browser
    subtotal += lineTotal;
    lines.push({
      slug: p.slug, name: p.name, tag: p.tag, colourway: cw,
      qty: qty, unitPrice: p.price, lineTotal: lineTotal
    });
  }

  /* ---------------- delivery ---------------------------------------- */
  /* 'quoted' mode: nothing is charged for delivery here — it is agreed with
     the customer on WhatsApp and collected with the COD cash. */
  const d = S.delivery || {};
  const quoted = (d.mode || 'flat') === 'quoted';
  let delivery;
  if (quoted) delivery = 0;
  else if (d.freeOver && subtotal >= d.freeOver) delivery = 0;
  else delivery = city.toLowerCase() === 'lahore' ? (d.lahore || 0) : (d.restOfPakistan || 0);

  const total = subtotal + delivery;

  // If the browser's arithmetic disagreed, trust ours but record the mismatch —
  // it means either a stale page or someone poking at localStorage.
  const claimed = (body.clientTotals && Number(body.clientTotals.total)) || null;
  const mismatch = claimed !== null && claimed !== total ? claimed : null;

  /* ---------------- hand off to the sheet --------------------------- */
  const endpoint = process.env.ORDER_SHEET_URL;
  const order = {
    idempotencyKey: String(body.idempotencyKey || '').slice(0, 40),
    placedAt: new Date().toISOString(),
    customer: { name, phone, email, city, address },
    payment: method,
    status: method === 'cod'
      ? (quoted ? 'confirmed — COD, delivery to quote' : 'confirmed — COD')
      : 'awaiting payment',
    notes,
    lines,
    subtotal, delivery, total,
    deliveryQuoted: quoted,
    leadTimeDays: S.leadTimeDays,
    summary: lines.map((l) => l.qty + ' x ' + l.name +
      (l.colourway ? ' (' + l.colourway + ')' : '')).join('; '),
    totalFormatted: money(total),
    clientMismatch: mismatch
  };

  if (!endpoint) {
    // Not configured yet. Say so plainly so the client shows its WhatsApp
    // fallback instead of pretending the order was filed.
    console.error('ORDER_SHEET_URL is not set — order not recorded', order.summary);
    return bad(res, 503, 'Order recording is not configured yet.');
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
      signal: ctrl.signal,
      redirect: 'follow'          // Apps Script 302s to googleusercontent
    });
    clearTimeout(t);

    const text = await r.text();
    let out = null;
    try { out = JSON.parse(text); } catch (e) {}

    if (!r.ok || !out || !out.ok || !out.orderNumber) {
      console.error('sheet rejected order', r.status, text.slice(0, 400));
      return bad(res, 502, 'We could not file that order.');
    }

    return res.status(200).json({
      ok: true,
      orderNumber: out.orderNumber,
      duplicate: !!out.duplicate,
      subtotal, delivery, total
    });

  } catch (err) {
    console.error('order handoff failed', err && err.message, order.summary);
    return bad(res, 502, 'We could not reach our order book.');
  }
};
