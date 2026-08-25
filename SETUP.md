# knotsocutepk — going live

The site works right now with nothing configured. The three steps below turn on
the parts that need something only you can provide.

Everything you edit lives in **one place**: the `CONFIG` block at the top of
[`app.js`](app.js). You never need to touch `index.html` for any of this.

---

## 1. WhatsApp orders (5 minutes) — do this first

Right now every **Enquire** button sends people to your Instagram profile. That
works, but a customer has to find the DM button and type out what they want.
With WhatsApp they tap once and the message is already written for them:

> Hi knotsocutepk! I'd like to order the ichigo mini (PKR 2,500). Is it available?

To turn it on, open `app.js` and put your number in line 17:

```js
whatsapp: '923001234567',
```

**Format matters.** Country code first, digits only — no `+`, no spaces, no
dashes. Drop the leading `0` from your mobile number:

| Your number    | What to write   |
| -------------- | --------------- |
| 0300 1234567   | `923001234567`  |
| 0321 9876543   | `923219876543`  |

Leave it as `''` and the buttons keep pointing at Instagram, so nothing breaks
while you decide.

---

## 2. Waitlist → Google Sheet (10 minutes)

Until this is set up, the form opens the visitor's email app addressed to you.
That works, but many people abandon it. Wiring it to a Sheet means signups land
silently in a spreadsheet you own.

### Create the sheet and script

1. Make a new spreadsheet at [sheets.new](https://sheets.new). Name it
   **knotsocutepk waitlist**.
2. In that sheet: **Extensions → Apps Script**.
3. Delete whatever is in the editor and paste this in:

```js
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Waitlist') || ss.insertSheet('Waitlist');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Joined', 'Name', 'Email', 'From']);
      sheet.getRange('A1:D1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var d = JSON.parse(e.postData.contents);
    sheet.appendRow([new Date(), d.name || '', d.email || '', d.source || '']);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

4. Click the **save** icon.
5. **Deploy → New deployment**. Click the gear next to "Select type" and pick
   **Web app**. Then set:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`  ← must be *Anyone*, not "Anyone with Google account"
6. **Deploy**. Google will ask you to authorise it — click through
   *Advanced → Go to (unsafe)* if it warns you. It's warning you about your own
   script.
7. Copy the **Web app URL**. It ends in `/exec`.

### Point the site at it

Paste that URL into `app.js` line 29:

```js
sheetEndpoint: 'https://script.google.com/macros/s/AKfycb..../exec',
```

Then test it: load your site, submit the form with your own email, and check the
sheet. A row should appear within a second or two.

> **If you ever edit the Apps Script**, you must **Deploy → Manage deployments →
> edit → Version: New version → Deploy** for the change to take effect. Saving
> alone does nothing to the live URL.

---

## 3. The members-only gate — currently OFF

Your original design blocked the whole site behind a "Follow us to come inside"
wall: visitors had to open Instagram, stay there 8 seconds, come back, and click
*Enter the shop* before they could see a single product.

I've turned it **off**, because it asks people to follow before they've seen
anything worth following, and most first-time visitors leave instead. Your
Instagram traffic already follows you; the gate mostly blocks new customers who
found you some other way.

If you want it back, set line 37 of `app.js`:

```js
followGate: true,
```

A middle path worth considering: leave it off until a drop sells out, then turn
it on for the next launch when there's real scarcity to gate.

---

## What I'd fix next

Two things I noticed but didn't change, because they're yours to decide:

**The contact email may have a typo.** The footer says
`notsocutepk@gmail.com` — no `k` at the front, while your brand is *k*notsocutepk.
If that's not a real inbox you're monitoring, customer emails are vanishing. It
appears in two places: the footer link in `index.html`, and `CONFIG.email` in
`app.js`.

**`uploads/` is 23 MB of nothing.** Thirty-odd pasted screenshots from the design
tool, referenced by no page. I've excluded them from deploys via `.vercelignore`,
so visitors never download them — but they still bloat the repo. Safe to delete
once you've checked none are photos you don't have elsewhere.

---

## Files in this project

| File | What it is |
| --- | --- |
| `index.html` | The whole site. All content and styling. |
| `app.js` | Behaviour + **the CONFIG block you edit**. |
| `favicon.svg` | The little strawberry in the browser tab. |
| `images/` | All 35 product and lifestyle photos. |
| `vercel.json` | Caching and security headers. |
| `robots.txt`, `sitemap.xml` | So Google can index the site. |
| `.vercelignore` | Keeps design files and `uploads/` out of the deploy. |
| `Knotsocutepk Landing v4.dc.html` | Your original design-canvas file. Kept as the design source of truth — not part of the live site. |
| `support.js` | Runtime the `.dc.html` file needs. Not part of the live site. |
| `knotsocutepk-site.html` | The old 2.9 MB export. Superseded by `index.html`. |
