# Fire Department Apparatus Check Web App

A clean, mobile-friendly web application for completing monthly apparatus and SCBA checklists online.

## Features
- Select any of the 8 units (Brush Truck/UTV/Trailer, SCBA, Squad 1/2, Engine 1/2, Truck 3, Tanker 1)
- Dynamic checklists matching the original forms
- Checkboxes and notes fields for every item
- Separate sections for SCBA Packs and Bottles
- Completed by + Date fields + signature pad
- Auto-saving drafts to browser localStorage
- Print-friendly layout
- Export completed check as PDF or JSON
- Dark theme with fire-department red accents
- Fully responsive (works on tablets and phones)

## How to Use
1. Open `index.html` in any modern browser (or serve via a local server).
2. Select a unit.
3. Complete the checks (toggle checkmarks and add notes).
4. Fill in name, date, and signature.
5. Use Save Draft, Print, or Export as needed.
6. Drafts persist in the browser until cleared.

## Customization
- Edit `data.js` to adjust item lists or the number of SCBA Packs/Bottles per unit.
- Modify `styles.css` for branding (colors, logo, etc.).
- Add department name/logo by editing the header in `index.html`.

## Notes
- This version stores data only in the browser (localStorage). No server or database is required for basic use.
- SCBA section counts are based on the original forms and can be fine-tuned if needed.
- Print view hides navigation and buttons for clean paper copies.

## Next Steps (optional)
- Backend storage / multi-user login
- History and reporting dashboard
- Offline PWA support
- Photo attachments for notes
- Department-specific branding
