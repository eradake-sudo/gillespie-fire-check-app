let currentUnit = null;
let signaturePad = null;
let scbaPackCount = 0;

function init() {
  renderUnitGrid();
  document.getElementById('back-btn').addEventListener('click', showUnitSelect);
  document.getElementById('print-btn').addEventListener('click', () => window.print());
  document.getElementById('export-pdf-btn').addEventListener('click', exportPDF);
  document.getElementById('clear-btn').addEventListener('click', clearForm);
}

function renderUnitGrid() {
  const grid = document.getElementById('unit-grid');
  grid.innerHTML = '';
  Object.entries(checklists).sort((a, b) => a[1].name.localeCompare(b[1].name)).forEach(([id, data]) => {
    const card = document.createElement('div');
    card.className = 'unit-card';
    card.innerHTML = `<h3>${data.name}</h3><p>Click to start check</p>`;
    card.addEventListener('click', () => loadChecklist(id));
    grid.appendChild(card);
  });
}

function showUnitSelect() {
  document.getElementById('unit-select').classList.remove('hidden');
  document.getElementById('checklist-view').classList.add('hidden');
  currentUnit = null;
}

function loadChecklist(unitId) {
  currentUnit = unitId;
  const data = checklists[unitId];
  document.getElementById('checklist-title').textContent = data.name;
  document.getElementById('unit-select').classList.add('hidden');
  document.getElementById('checklist-view').classList.remove('hidden');
  scbaPackCount = 0;
  const oldControls = document.getElementById('scba-controls');
  if (oldControls) oldControls.remove();
  renderChecklist(data);
  initSignaturePad();
}

function renderChecklist(data) {
  const container = document.getElementById('checklist-content');
  container.innerHTML = '';
  container.style.paddingBottom = '80px';

  if (data.mainItems.length > 0) {
    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<div class="section-title">Apparatus Checks</div>`;
    data.mainItems.forEach((item, idx) => section.appendChild(createItemRow(item, `main-${idx}`)));
    container.appendChild(section);
  }

  // SCBA multi-pack workflow
  if (currentUnit === 'scba') {
    const controls = document.createElement('div');
    controls.id = 'scba-controls';
    controls.style.cssText = 'position:fixed !important;bottom:0 !important;left:0 !important;right:0 !important;background:#1a1a1a;padding:0.75rem 1rem;border-top:1px solid #333;display:flex;align-items:center;gap:0.5rem;z-index:9999;box-shadow:0 -2px 8px rgba(0,0,0,0.4);';
    controls.innerHTML = `
      <button type="button" id="next-pack-btn" class="btn primary">Next Pack</button>
      <button type="button" id="finished-btn" class="btn secondary">Finished</button>
      <span id="pack-counter" style="margin-left:auto;color:#a0a0a0;font-size:0.85rem;">Packs completed: 0</span>
    `;
    document.body.appendChild(controls);
    document.getElementById('next-pack-btn').addEventListener('click', addNextPack);
    document.getElementById('finished-btn').addEventListener('click', showSignatureSection);
    setTimeout(() => addNextPack(), 0);
  } else {
    // Static SCBA sections for apparatus
    for (let i = 0; i < (data.scbaPacks || 0); i++) {
      const section = document.createElement('div');
      section.className = 'section';
      section.innerHTML = `<div class="section-title">SCBA Pack #${i + 1}</div>`;
      scbaItems.forEach((item, j) => section.appendChild(createItemRow(item, `pack-${i}-${j}`)));
      container.appendChild(section);
    }
    for (let i = 0; i < (data.scbaBottles || 0); i++) {
      const section = document.createElement('div');
      section.className = 'section';
      section.innerHTML = `<div class="section-title">SCBA Bottle #${i + 1}</div>`;
      scbaItems.forEach((item, j) => section.appendChild(createItemRow(item, `bottle-${i}-${j}`)));
      container.appendChild(section);
    }
  }

  // Signature section (hidden until Finished)
  const sigSection = document.createElement('div');
  sigSection.className = 'section signature-section';
  sigSection.id = 'signature-section';
  sigSection.style.display = currentUnit === 'scba' ? 'none' : 'block';
  sigSection.innerHTML = `
    <div class="section-title">Completed By</div>
    <div class="sig-fields">
      <label>Printed Name <input type="text" id="completed-by" placeholder="Full name"></label>
      <label>Date <input type="date" id="check-date"></label>
      <label>Signature
        <div class="sig-pad-wrap">
          <canvas id="signature-pad" width="400" height="160"></canvas>
          <button type="button" id="clear-sig" class="btn secondary" style="margin-top:0.5rem;font-size:0.8rem;padding:0.4rem 0.8rem;">Clear Signature</button>
        </div>
      </label>
    </div>
  `;
  container.appendChild(sigSection);
}

function addNextPack() {
  scbaPackCount++;
  const container = document.getElementById('checklist-content');
  const sigSection = document.getElementById('signature-section');
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `<div class="section-title">SCBA Pack ${scbaPackCount}</div>`;
  scbaItems.forEach((item, j) => section.appendChild(createItemRow(item, `pack-${scbaPackCount}-${j}`)));
  container.insertBefore(section, sigSection);
  document.getElementById('pack-counter').textContent = `Packs completed: ${scbaPackCount}`;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showSignatureSection() {
  const sig = document.getElementById('signature-section');
  if (sig) {
    sig.style.display = 'block';
    sig.scrollIntoView({ behavior: 'smooth', block: 'start' });
    initSignaturePad();
  }
}

function initSignaturePad() {
  const canvas = document.getElementById('signature-pad');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function start(e) { e.preventDefault(); drawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  function end() { drawing = false; }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  document.getElementById('clear-sig').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  signaturePad = { canvas, ctx };
}

function createItemRow(label, key) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <div class="item-label">${label}</div>
    <button type="button" class="check-btn" data-key="${key}"></button>
    <textarea class="notes-input" data-key="${key}" placeholder="Notes"></textarea>
  `;
  const btn = row.querySelector('.check-btn');
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    const isChecked = !this.classList.contains('checked');
    this.classList.toggle('checked', isChecked);
    this.textContent = isChecked ? '✓' : '';
  });
  return row;
}

function collectFormData() {
  const items = {};
  document.querySelectorAll('.check-btn').forEach(btn => {
    const key = btn.dataset.key;
    if (!items[key]) items[key] = {};
    items[key].checked = btn.classList.contains('checked');
  });
  document.querySelectorAll('.notes-input').forEach(el => {
    const key = el.dataset.key;
    if (!items[key]) items[key] = {};
    items[key].notes = el.value.trim();
  });
  let sig = '';
  if (signaturePad && signaturePad.canvas) {
    // Check if canvas has any drawing
    const ctx = signaturePad.ctx;
    const imageData = ctx.getImageData(0, 0, signaturePad.canvas.width, signaturePad.canvas.height);
    const hasDrawing = imageData.data.some((v, i) => i % 4 === 3 && v > 0);
    if (hasDrawing) {
      sig = signaturePad.canvas.toDataURL('image/png');
    }
  }
  return {
    items,
    completedBy: document.getElementById('completed-by')?.value.trim() || '',
    signature: sig,
    date: document.getElementById('check-date')?.value || '',
    unit: currentUnit,
    unitName: checklists[currentUnit]?.name || currentUnit,
    timestamp: new Date().toISOString()
  };
}

function clearForm() {
  if (!confirm('Clear all entries on this form?')) return;
  document.querySelectorAll('.check-btn').forEach(btn => { btn.classList.remove('checked'); btn.textContent = ''; });
  document.querySelectorAll('.notes-input').forEach(el => el.value = '');
  document.getElementById('completed-by').value = '';
  if (signaturePad) signaturePad.ctx.clearRect(0, 0, signaturePad.canvas.width, signaturePad.canvas.height);
}

async function exportPDF() {
  if (!currentUnit) { alert('Select a unit first.'); return; }
  const btn = document.getElementById('export-pdf-btn');
  const originalText = btn.textContent;
  btn.textContent = 'Generating...';
  btn.disabled = true;
  try {
    const data = collectFormData();
    if (!window.jspdf || !window.jspdf.jsPDF) {
      // Assume jspdf is loaded or handle error
      alert('jsPDF library not loaded.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;

    // Header bar
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('GILLESPIE FIRE DEPT', margin, 10);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Monthly Apparatus & SCBA Check', margin, 16);

    doc.setTextColor(0, 0, 0);
    let y = 30;

    // Unit title
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text(data.unitName || 'Apparatus Check', margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${data.date || '—'}     Completed by: ${data.completedBy || '—'}`, margin, y);
    y += 8;

    // Table header
    doc.setFillColor(40, 40, 40);
    doc.rect(margin, y - 4, pageW - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('ITEM', margin + 8, y);
    doc.text('NOTES', margin + 100, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    const allItems = [];
    const unit = checklists[currentUnit];
    if (unit.mainItems) unit.mainItems.forEach((label, i) => allItems.push({ label, key: `main-${i}`, section: 'Apparatus' }));
    // Collect all packs that were added
    for (let p = 1; p <= 50; p++) {
      const firstKey = `pack-${p}-0`;
      if (!data.items[firstKey]) break;
      scbaItems.forEach((label, i) => allItems.push({ label, key: `pack-${p}-${i}`, section: `SCBA Pack ${p}` }));
    }
    for (let b = 0; b < (unit.scbaBottles || 0); b++) {
      scbaItems.forEach((label, i) => allItems.push({ label, key: `bottle-${b}-${i}`, section: `SCBA Bottle #${b+1}` }));
    }

    let currentSection = '';
    allItems.forEach((item, idx) => {
      if (y > pageH - 30) {
        doc.addPage();
        y = 15;
      }
      if (item.section !== currentSection && item.section !== 'Apparatus') {
        currentSection = item.section;
        y += 3;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(180, 30, 50);
        doc.text(currentSection.toUpperCase(), margin, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      } else if (item.section === 'Apparatus') {
        currentSection = item.section;
      }

      const entry = data.items[item.key] || {};
      const checked = entry.checked;
      const notes = entry.notes || '';

      // Row background
      if (idx % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3.5, pageW - margin * 2, 6, 'F');
      }

      // Checkmark box
      doc.setDrawColor(100);
      doc.setLineWidth(0.3);
      doc.rect(margin, y - 3, 4, 4);
      if (checked) {
        doc.setFillColor(34, 197, 94);
        doc.rect(margin + 0.5, y - 2.5, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text('✓', margin + 0.8, y);
        doc.setTextColor(0, 0, 0);
      }

      // Item label
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      const labelLines = doc.splitTextToSize(item.label, 85);
      doc.text(labelLines, margin + 6, y);

      // Notes
      if (notes) {
        const noteLines = doc.splitTextToSize(notes, 70);
        doc.setTextColor(80);
        doc.text(noteLines, margin + 100, y);
        doc.setTextColor(0, 0, 0);
      }

      y += Math.max(labelLines.length, notes ? doc.splitTextToSize(notes, 70).length : 1) * 4 + 1;
    });

    // Signature section
    if (y > pageH - 45) { doc.addPage(); y = 15; }
    y += 8;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('SIGNATURE', margin, y);
    y += 4;

    if (data.signature && data.signature.length > 100 && data.signature.startsWith('data:image')) {
      try {
        doc.addImage(data.signature, 'PNG', margin, y, 55, 22);
        y += 26;
      } catch (e) {
        doc.setFont(undefined, 'italic');
        doc.setFontSize(8);
        doc.text('(Signature could not be rendered)', margin, y + 4);
        y += 10;
      }
    } else {
      doc.setDrawColor(180);
      doc.rect(margin, y, 55, 18);
      doc.setFont(undefined, 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('No signature', margin + 2, y + 10);
      doc.setTextColor(0, 0, 0);
      y += 22;
    }

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(`Printed name: ${data.completedBy || '—'}`, margin, y);
    y += 5;
    doc.text(`Date: ${data.date || '—'}`, margin, y);

    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('Gillespie Fire Dept • Monthly Apparatus Check', margin, pageH - 8);

    doc.save(`${(data.unitName || 'check').replace(/[^a-z0-9]+/gi, '_')}_${data.date || 'undated'}.pdf`);
  } catch (err) {
    console.error(err);
    alert('PDF export failed: ' + (err.message || 'Unknown error'));
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}


document.addEventListener('DOMContentLoaded', init);
