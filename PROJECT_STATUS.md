# Project Status — Gillespie Fire Apparatus Check App

**Last updated:** 2026-11-23  
**Goal:** Client-side web app for monthly apparatus and SCBA checklists. Dark theme, phone and tablet layout, drafts on the device, and one PDF button.

## Current state

The app is a static page: `index.html`, `app.js`, `styles.css`, and `data.js`. Checklist wording is unchanged from the department forms.

### What works

- Eight units, in station order: Engine 1, Engine 2, Truck 3, Tanker 1, Squad 1, Squad 2, Brush Truck / UTV / Trailer, SCBA
- Check boxes, notes, and **Mark section good**
- One name field and one date field, in the checklist header
- Date defaults to today. The name is remembered for the next unit
- Progress line: how many items are checked, still open, and have notes
- Signature pad on a white canvas, included on the PDF
- Drafts save on their own. Reopening a unit restores checks, notes, name, date, pack count, and the signature
- **Clear** deletes that unit's draft
- **Export PDF** is the only way to finish a check. The PDF is letter size, with the department mark, summary counts, notes, and signature
- PDF library is stored in `vendor/` so export does not depend on a CDN
- Service worker caches the page for offline use after the first online visit

### SCBA flow

Apparatus units show their fixed pack and bottle sections. The SCBA unit starts with one pack. **Next pack** adds another. **Done, sign** reveals the signature. Added packs are part of the draft.

### Not in this version

- Shared storage between people or devices
- A history of submitted checks
- Photo attachments

Those need a place to store records. The check itself does not.

## File roles

- `index.html` — shell, unit list, checklist header, action bar
- `styles.css` — dark theme, phone layout, print styles
- `app.js` — interaction, signature, drafts, and PDF export
- `data.js` — checklist definitions and the shared SCBA lines
