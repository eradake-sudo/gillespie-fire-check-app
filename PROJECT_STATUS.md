# Project Status — Gillespie Fire Apparatus Check App

**Last updated:** 2026-11-23  
**Repo:** https://github.com/eradake-sudo/gillespie-fire-check-app  
**Goal:** Client-side web app for monthly apparatus + SCBA checklists. Dark theme, mobile-friendly, localStorage drafts, print + PDF export.

## Current State

The modular source files (`index.html`, `styles.css`, `app.js`, `data.js`) were pushed on 2026-11-23. The data and visual design are solid. Several pieces of functionality are incomplete or out of sync between HTML and JS.

### What works
- Unit selection grid
- Dynamic checklist rendering from `data.js` (all 8 units)
- Checkmark toggle buttons + notes fields
- Signature pad (canvas) is created dynamically by JS
- PDF generation logic exists in `app.js` (uses jsPDF)
- Print CSS
- Dark theme matching the department style

### Known issues / incomplete items (priority order)

1. **HTML ↔ JS button mismatch**
   - `app.js` listens for `#export-pdf-btn` and calls `exportPDF()`.
   - `index.html` has `#export-btn` (labeled “Export JSON”) and no PDF button.
   - `#save-btn` exists in HTML but is not wired in `app.js`.

2. **Draft saving is missing**
   - README mentions localStorage drafts, but `app.js` currently has **no** `localStorage` code at all.
   - Need to implement save/load/clear of form state keyed by unit.

3. **jsPDF not loaded**
   - `exportPDF()` checks for `window.jspdf` and fails if missing.
   - The standalone HTML version includes the CDN; the modular `index.html` does not.
   - Add: `<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>`

4. **Signature / completed-by flow**
   - Signature section is injected by JS and works for most units.
   - SCBA multi-pack flow hides the signature until “Finished” is clicked — needs testing.
   - Completed-by and date fields appear both in the header (HTML) and inside the signature section (JS). Decide on one place.

5. **Logo**
   - Header currently shows a styled “FD” placeholder.
   - A Gillespie Fire Dept Maltese cross logo was prepared earlier; it can be dropped in as an `<img>` or CSS background.

6. **JSON export**
   - Button exists but no handler is wired. Easy to add using the existing `collectFormData()`.

## Recommended next steps (for Cursor / development)

1. Fix button IDs and wire `#save-btn` + `#export-btn` (or replace with PDF).
2. Implement localStorage draft save/load (auto-save on change + manual button).
3. Add the jsPDF CDN script to `index.html`.
4. Test the SCBA multi-pack + signature flow end-to-end.
5. Replace the logo placeholder with the real Gillespie logo.
6. Optional: add a simple service worker for offline PWA use.

## File roles
- `index.html` — shell + unit select + checklist view
- `styles.css` — dark theme, responsive, print styles
- `app.js` — all interaction, signature pad, PDF export
- `data.js` — checklist definitions + SCBA item list

A more complete single-file version exists in the original workspace as `fire-check-app-standalone.html` (includes jsPDF and is closer to working).
