# Gillespie Fire apparatus checks

Monthly apparatus and SCBA checklists for the Gillespie Fire Department. A firefighter opens the page on a phone or tablet, picks a unit, marks each item, writes a note when something is wrong, signs, and exports a PDF.

Checks stay on the device. There is no account and no server.

## Use it

1. Open the page.
2. Pick a unit. Engine 1, Engine 2, Truck 3, Tanker 1, Squad 1, Squad 2, the brush truck, and SCBA packs are on the list.
3. Tap the box when an item is good. Use **Mark section good** when a whole block passes.
4. Write a note on anything that needs attention.
5. Sign, then **Export PDF**.
6. Leave and come back on the same device. The draft is still there, including the signature. **Clear** deletes that draft.

The name you type is remembered for the next unit. SCBA checks add one pack at a time. Tap **Next pack** for another, then **Done, sign**.

After the page has been opened once with a connection, it can be used again offline. Add it to the home screen from the browser menu if the tablet should open it like an app.

## Run it locally

From this folder:

```bash
python3 -m http.server 4731
```

Then open `http://127.0.0.1:4731`.

Opening `index.html` as a file also works for a single check. Install-to-home-screen and offline use need the page served over http or https.

## Change a checklist

Item wording and the number of SCBA packs and bottles live in `data.js`. Leave the shape of each unit as it is: `name`, `mainItems`, `scbaPacks`, and `scbaBottles`. The shared SCBA lines are `scbaItems`.

## Files

- `index.html` — page shell
- `app.js` — checks, drafts, signature, and PDF export
- `data.js` — the department's checklist lines
- `styles.css` — dark theme, phone layout, print layout
- `logo.png` — Gillespie Fire Department mark
- `vendor/jspdf.umd.min.js` — PDF library, stored locally so export works offline
- `sw.js` and `manifest.json` — offline use after the first visit
