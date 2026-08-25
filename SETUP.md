# knotsocutepk — running the shop

The site works right now. The steps below switch on the parts that need
something only you can provide.

**Everything you edit day to day lives in one file: [`products.json`](products.json).**
Prices, photos, descriptions, colourways, delivery charges, your WhatsApp number.
Edit it on GitHub, commit, and Vercel rebuilds every page automatically. You never
need to run anything on your computer.

---

## Must be done before this goes live

These four are blanks you left in the brief. The site is running on placeholders.

| # | What | Where | Currently |
| --- | --- | --- | --- |
| 1 | WhatsApp number | `products.json` → `settings.contact.whatsapp` | empty → falls back to Instagram |
| 2 | Your real email | `products.json` → `settings.contact.email` | `notsocutepk@gmail.com` — **missing the leading k?** |
| 3 | Delivery charges | `products.json` → `settings.delivery` | **placeholder** 250 Lahore / 350 elsewhere |
| 4 | Courier name | `products.json` → `settings.contact.courier` | "our courier" |

Plus two things I could not know:

| # | What | Why it matters |
| --- | --- | --- |
| 5 | **Colourways** on 5 pieces | I guessed them from your photos. Customers will order colours you may not stock. Marked `"colourwaysStatus": "REVIEW"` — delete that line once you have corrected the list. |
| 6 | **The returns policy** | `/policies` is a promise to customers. Passages I drafted are highlighted on the page. Read it and correct the terms. |

### WhatsApp number format

Country code first, digits only. No `+`, no spaces, no dashes. Drop the leading `0`.

| Your number | What to write |
| --- | --- |
| 0300 1234567 | `923001234567` |
| 0321 9876543 | `923219876543` |

---

## Orders → your Google Sheet (20 minutes, one time)

Until this is connected, checkout shows customers a WhatsApp fallback with their
whole order pre-filled. Nothing is lost, but you have to copy it out by hand.

### 1. Make the sheet and script

1. New spreadsheet at [sheets.new](https://sheets.new). Call it **knotsocutepk orders**.
2. **Extensions → Apps Script**.
3. Delete what's there and paste this in:

```js
/* knotsocutepk — order book.
   Assigns the order number, writes the row, emails you and the customer. */

var YOUR_EMAIL = 'notsocutepk@gmail.com';   // <-- put YOUR real email here
var SHOP_NAME  = 'knotsocutepk';

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);                      // one order at a time, so two
  try {                                      // customers can't get one number
    var o = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Order', 'Placed', 'Status', 'Name', 'Phone', 'Email',
                       'City', 'Address', 'Items', 'Subtotal', 'Delivery',
                       'Total', 'Payment', 'Notes', 'Key']);
      sheet.getRange('A1:O1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Already filed? Return the same number instead of making a second order.
    if (o.idempotencyKey) {
      var keys = sheet.getRange(1, 15, Math.max(1, sheet.getLastRow()), 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (keys[i][0] === o.idempotencyKey) {
          return json({ ok: true, orderNumber: sheet.getRange(i + 1, 1).getValue(),
                        duplicate: true });
        }
      }
    }

    var orderNumber = 'KSC-' + ('000' + sheet.getLastRow()).slice(-4);

    sheet.appendRow([
      orderNumber, new Date(), o.status, o.customer.name,
      "'" + o.customer.phone,                 // leading ' keeps Sheets from
      o.customer.email, o.customer.city,      // eating the leading digits
      o.customer.address, o.summary, o.subtotal, o.delivery, o.total,
      o.payment, o.notes, o.idempotencyKey
    ]);

    var itemLines = o.lines.map(function (l) {
      return '  ' + l.qty + ' x ' + l.name +
             (l.colourway ? ' (' + l.colourway + ')' : '') + '   PKR ' + l.lineTotal;
    }).join('\n');

    // ---- to you ----
    MailApp.sendEmail({
      to: YOUR_EMAIL,
      subject: 'New order ' + orderNumber + ' — PKR ' + o.total + ' — ' + o.customer.city,
      body: orderNumber + '\n\n' + itemLines +
            '\n\nSubtotal  PKR ' + o.subtotal +
            '\nDelivery  PKR ' + o.delivery +
            '\nTOTAL     PKR ' + o.total + '  (' + o.payment + ')' +
            '\n\n' + o.customer.name +
            '\n' + o.customer.phone +
            '\n' + o.customer.email +
            '\n' + o.customer.address + ', ' + o.customer.city +
            (o.notes ? '\n\nNotes: ' + o.notes : '') +
            (o.clientMismatch ? '\n\n[!] The browser reported a different total (' +
              o.clientMismatch + '). The figure above is the correct one.' : '')
    });

    // ---- to the customer ----
    MailApp.sendEmail({
      to: o.customer.email,
      subject: 'Your ' + SHOP_NAME + ' order ' + orderNumber,
      body: 'Thank you — we have your order.\n\n' +
            orderNumber + '\n\n' + itemLines +
            '\n\nSubtotal  PKR ' + o.subtotal +
            '\nDelivery  PKR ' + o.delivery +
            '\nTOTAL     PKR ' + o.total +
            '\n\nPayable in cash when the parcel arrives.\n\n' +
            'Every piece is made by hand, so it takes about ' + o.leadTimeDays +
            ' days before it ships. We will message you the tracking number.\n\n' +
            'Delivering to:\n' + o.customer.name + '\n' + o.customer.address + ', ' +
            o.customer.city + '\n' + o.customer.phone + '\n\n' +
            'Anything to change, just reply to this email.\n\n— ' + SHOP_NAME
    });

    return json({ ok: true, orderNumber: orderNumber });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. **Change `YOUR_EMAIL` on line 4** to your real address, then save.
5. **Deploy → New deployment**. Gear icon → **Web app**. Set:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone` ← must be *Anyone*, not "Anyone with Google account"
6. **Deploy**, authorise it (click *Advanced → Go to (unsafe)* — it's warning you
   about your own script), and copy the **Web app URL**. It ends in `/exec`.

### 2. Give the URL to Vercel

This one does **not** go in `products.json` — it stays server-side so nobody can
spam your order book directly.

1. Vercel → your project → **Settings → Environment Variables**
2. Add: name `ORDER_SHEET_URL`, value = the `/exec` URL, all environments
3. **Redeploy** (Deployments → latest → ⋯ → Redeploy). Environment variables only
   apply to new builds.

### 3. Test it

Place a real order on the live site with your own email. Within a few seconds you
should get: a row in the sheet, an email to you, and a receipt to the customer.

> **If you ever edit the Apps Script**, you must **Deploy → Manage deployments →
> edit (pencil) → Version: New version → Deploy**. Saving alone does not change
> the live URL.

### Worth knowing: the email limit

A free Gmail account can send **100 emails a day** through Apps Script. Each order
sends two — one to you, one to the customer. So **about 50 orders a day** before
emails start silently failing. Orders still get written to the sheet either way.
If you ever get near that, tell me and I'll move email onto a proper sender.

---

## The waitlist

Separate from orders. Currently the form opens the visitor's email app addressed
to you. To collect signups into a sheet instead, follow the same Apps Script
pattern with a simpler script, then set `window.KSC_WAITLIST_ENDPOINT` — ask me
and I'll wire it up in ten minutes.

---

## Adding, removing and changing pieces

All in `products.json`. Commit the change and the whole site rebuilds — the shop
grid, the product page, the home page, the sitemap and the structured data.

**A new piece** — copy an existing block and change the fields:

```json
{
  "slug": "cherry-clip",
  "idx": "10",
  "name": "cherry clip",
  "tag": "hair clip",
  "category": "charms",
  "price": 400,
  "available": true,
  "tint": "#F7E4EA",
  "blurb": "One line for the home page.",
  "description": "The longer version for the product page.",
  "colourways": ["red", "cream"],
  "images": [
    { "src": "images/cherry-clip.jpg", "w": 1000, "h": 1333,
      "alt": "A crochet cherry hair clip in red yarn" }
  ]
}
```

Upload the photo to `images/` first. **The build fails on purpose if a photo is
missing**, rather than publishing a page with a hole in it.

- `slug` becomes the web address, so `cherry-clip` → `/shop/cherry-clip`.
  Lowercase letters, numbers and dashes only.
- `w` and `h` are the photo's real pixel dimensions. Getting them right stops the
  page jumping around while images load.
- **Sold out:** set `"available": false`. The piece stays visible with a *sold out*
  badge and Add-to-cart switches off.
- **No colourway choice:** use `"colourways": []`.

---

## How the site is put together

```
products.json      the catalogue — the only file you normally edit
build.js           generates every page from it. No dependencies.
src/
  site.css         all styling, one cached file across 15 pages
  shop.js          cart, drawer, money formatting — on every page
  home.js  shopfilter.js  pdp.js  cartpage.js  checkout.js  confirmed.js
api/order.js       recomputes every price server-side, then files the order
images/            all photos
```

Generated by `build.js` — **don't hand-edit these**, your changes get overwritten
on the next build: `index.html`, `shop/`, `cart/`, `checkout/`, `order/`,
`policies/`, `catalogue.js`, `sitemap.xml`.

**Why prices are recomputed on the server:** the cart lives in the browser, where
anyone can edit it. `api/order.js` throws away whatever totals the browser claims
and recalculates from `products.json`. A customer who edits their cart to say
"PKR 1" still gets charged the real amount.

---

## What is deliberately not built yet

Noted so they're easy to add later, not forgotten: customer accounts, an order
tracking page, discount codes, reviews, a wishlist, stock counts, and online card
payment.

On **card payment** — Stripe and PayPal do not work for receiving money in
Pakistan. When you want cards, the options are Safepay or PayFast, and both need a
registered business with an NTN. `api/order.js` has the payment step isolated so
that slots in without rebuilding checkout.
