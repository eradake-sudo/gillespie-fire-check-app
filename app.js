const UNIT_ORDER = [
  "engine-1",
  "engine-2",
  "truck-3",
  "tanker-1",
  "squad-1",
  "squad-2",
  "brush-truck",
  "scba"
];

const NAME_KEY = "gfd-checker-name";

let currentUnit = null;
let signaturePad = null;
let scbaPackCount = 0;
let hydrating = false;
let saveTimer = 0;
let toastTimer = 0;
let logoData = null;

function draftKey(unitId) {
  return `gfd-draft:${unitId}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return "—";
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function readDraft(unitId) {
  try {
    const raw = localStorage.getItem(draftKey(unitId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function rememberedName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch (error) {
    return "";
  }
}

function draftHasWork(draft) {
  if (!draft) return false;
  if (draft.signature) return true;
  if ((draft.scbaPackCount || 0) > 1) return true;
  if (draft.date && draft.date !== todayISO()) return true;
  return Object.values(draft.items || {}).some((item) => item.checked || item.notes);
}

function unitDetail(id, data) {
  if (id === "scba") return "Add each pack as you inspect it";
  const parts = [];
  if (data.mainItems.length) {
    parts.push(`${data.mainItems.length} checks`);
  }
  if (data.scbaPacks) {
    parts.push(`${data.scbaPacks} pack${data.scbaPacks === 1 ? "" : "s"}`);
  }
  if (data.scbaBottles) {
    parts.push(`${data.scbaBottles} bottle${data.scbaBottles === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function init() {
  renderUnitGrid();
  captureLogo();
  const logo = document.querySelector("img.logo");
  if (logo && !logo.complete) logo.addEventListener("load", captureLogo);

  document.getElementById("back-btn").addEventListener("click", showUnitSelect);
  document.getElementById("export-pdf-btn").addEventListener("click", exportPDF);
  document.getElementById("clear-btn").addEventListener("click", clearForm);
  document.getElementById("completed-by").addEventListener("input", scheduleSave);
  document.getElementById("check-date").addEventListener("change", scheduleSave);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function captureLogo() {
  const img = document.querySelector("img.logo");
  if (!img || !img.naturalWidth) return;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d").drawImage(img, 0, 0);
  try {
    logoData = canvas.toDataURL("image/png");
  } catch (error) {
    logoData = null;
  }
}

function renderUnitGrid() {
  const grid = document.getElementById("unit-grid");
  grid.innerHTML = "";
  UNIT_ORDER.forEach((id) => {
    const data = checklists[id];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "unit-card";
    const working = draftHasWork(readDraft(id));
    card.innerHTML = `
      <span class="unit-name">${escapeHtml(data.name)}</span>
      <span class="unit-detail">${escapeHtml(unitDetail(id, data))}</span>
      ${working ? '<span class="draft-pill">Draft on this device</span>' : ""}
    `;
    card.addEventListener("click", () => loadChecklist(id));
    grid.appendChild(card);
  });
}

function showUnitSelect() {
  if (currentUnit) saveDraft();
  currentUnit = null;
  signaturePad = null;
  scbaPackCount = 0;
  document.body.classList.remove("has-scba");
  document.getElementById("unit-select").classList.remove("hidden");
  document.getElementById("checklist-view").classList.add("hidden");
  document.getElementById("dock").classList.add("hidden");
  document.getElementById("scba-slot").innerHTML = "";
  document.getElementById("save-state").textContent = "";
  renderUnitGrid();
  window.scrollTo(0, 0);
}

function loadChecklist(unitId, options = {}) {
  currentUnit = unitId;
  signaturePad = null;
  const data = checklists[unitId];
  const draft = options.skipDraft ? null : readDraft(unitId);
  document.getElementById("checklist-title").textContent = data.name;
  document.getElementById("unit-select").classList.add("hidden");
  document.getElementById("checklist-view").classList.remove("hidden");
  document.getElementById("dock").classList.remove("hidden");
  document.getElementById("scba-slot").innerHTML = "";
  document.body.classList.toggle("has-scba", unitId === "scba");

  const packs = unitId === "scba" ? Math.max(1, draft?.scbaPackCount || 1) : 0;
  renderChecklist(data, packs);
  applyDraft(draft, options.keepName || "");
  window.scrollTo(0, 0);
}

function renderChecklist(data, packCount) {
  const container = document.getElementById("checklist-content");
  container.innerHTML = "";

  if (data.mainItems.length) {
    addSection(container, "Apparatus", data.mainItems, (index) => `main-${index}`);
  }

  if (currentUnit === "scba") {
    scbaPackCount = packCount;
    for (let pack = 1; pack <= packCount; pack += 1) {
      addSection(container, `SCBA pack ${pack}`, scbaItems, (index) => `pack-${pack}-${index}`);
    }
    mountScbaControls();
  } else {
    scbaPackCount = 0;
    for (let pack = 0; pack < (data.scbaPacks || 0); pack += 1) {
      addSection(container, `SCBA pack ${pack + 1}`, scbaItems, (index) => `pack-${pack}-${index}`);
    }
    for (let bottle = 0; bottle < (data.scbaBottles || 0); bottle += 1) {
      addSection(container, `SCBA bottle ${bottle + 1}`, scbaItems, (index) => `bottle-${bottle}-${index}`);
    }
  }

  container.appendChild(buildSignature(currentUnit === "scba"));
}

function addSection(container, title, items, keyFor, beforeNode) {
  const section = document.createElement("div");
  section.className = "section";
  section.innerHTML = `
    <div class="section-title">
      <h3>${escapeHtml(title)}</h3>
      <button type="button" class="mark-section">Mark section good</button>
    </div>
  `;
  items.forEach((item, index) => {
    section.appendChild(createItemRow(item, keyFor(index), title));
  });
  section.querySelector(".mark-section").addEventListener("click", () => {
    section.querySelectorAll(".check-btn").forEach((button) => setChecked(button, true));
    updateProgress();
    saveDraft();
  });
  if (beforeNode) container.insertBefore(section, beforeNode);
  else container.appendChild(section);
  return section;
}

function createItemRow(label, key, section) {
  const row = document.createElement("div");
  row.className = "item-row";
  row.dataset.key = key;
  row.dataset.label = label;
  row.dataset.section = section;
  row.innerHTML = `
    <div class="item-label">${escapeHtml(label)}</div>
    <button type="button" class="check-btn" aria-pressed="false" aria-label="Mark good: ${escapeHtml(label)}"></button>
    <textarea class="notes-input" placeholder="Notes" aria-label="Notes for ${escapeHtml(label)}"></textarea>
  `;
  const button = row.querySelector(".check-btn");
  button.addEventListener("click", () => {
    setChecked(button, !button.classList.contains("checked"));
    updateProgress();
    saveDraft();
  });
  row.querySelector(".notes-input").addEventListener("input", scheduleSave);
  return row;
}

function setChecked(button, checked) {
  button.classList.toggle("checked", checked);
  button.textContent = checked ? "✓" : "";
  button.setAttribute("aria-pressed", checked ? "true" : "false");
}

function buildSignature(startHidden) {
  const section = document.createElement("div");
  section.className = `section signature-section${startHidden ? " hidden" : ""}`;
  section.id = "signature-section";
  section.innerHTML = `
    <div class="section-title"><h3>Signature</h3></div>
    <div class="sig-fields">
      <p class="sig-help">Sign with a finger or a mouse. The signature is printed on the PDF.</p>
      <canvas id="signature-pad" width="600" height="200"></canvas>
      <button type="button" id="clear-sig" class="btn secondary">Clear signature</button>
    </div>
  `;
  return section;
}

function mountScbaControls() {
  const slot = document.getElementById("scba-slot");
  slot.innerHTML = `
    <div id="scba-controls" class="scba-controls">
      <button type="button" id="next-pack-btn" class="btn primary">Next pack</button>
      <button type="button" id="finished-btn" class="btn secondary">Done, sign</button>
      <span id="pack-counter"></span>
    </div>
  `;
  document.getElementById("next-pack-btn").addEventListener("click", addNextPack);
  document.getElementById("finished-btn").addEventListener("click", showSignatureSection);
  updatePackCounter();
}

function updatePackCounter() {
  const counter = document.getElementById("pack-counter");
  if (counter) counter.textContent = `Packs: ${scbaPackCount}`;
}

function addNextPack() {
  scbaPackCount += 1;
  const container = document.getElementById("checklist-content");
  const signature = document.getElementById("signature-section");
  const pack = scbaPackCount;
  const section = addSection(
    container,
    `SCBA pack ${pack}`,
    scbaItems,
    (index) => `pack-${pack}-${index}`,
    signature
  );
  updatePackCounter();
  updateProgress();
  saveDraft();
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showSignatureSection() {
  const signature = document.getElementById("signature-section");
  if (!signature) return;
  signature.classList.remove("hidden");
  signature.scrollIntoView({ behavior: "smooth", block: "start" });
  saveDraft();
}

function initSignaturePad(existingUrl) {
  const canvas = document.getElementById("signature-pad");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const pad = { canvas, ctx, dirty: false, pending: existingUrl || "" };
  signaturePad = pad;

  if (existingUrl) {
    const image = new Image();
    image.onload = () => {
      if (signaturePad !== pad) return;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      pad.dirty = true;
    };
    image.src = existingUrl;
  }

  let drawing = false;

  function position(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!canvas.getBoundingClientRect().width) return;
    event.preventDefault();
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const point = position(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    event.preventDefault();
    const point = position(event);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    pad.dirty = true;
  });

  function finishDraw() {
    if (!drawing) return;
    drawing = false;
    saveDraft();
  }

  canvas.addEventListener("pointerup", finishDraw);
  canvas.addEventListener("pointercancel", finishDraw);
  document.getElementById("clear-sig").addEventListener("click", () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pad.dirty = false;
    pad.pending = "";
    saveDraft();
  });
}

function applyDraft(draft, keepName) {
  hydrating = true;
  const name = document.getElementById("completed-by");
  const date = document.getElementById("check-date");
  name.value = draft?.completedBy || keepName || rememberedName();
  date.value = draft?.date || todayISO();

  if (draft?.items) {
    document.querySelectorAll(".item-row").forEach((row) => {
      const saved = draft.items[row.dataset.key];
      if (!saved) return;
      if (saved.checked) setChecked(row.querySelector(".check-btn"), true);
      row.querySelector(".notes-input").value = saved.notes || "";
    });
  }

  const signature = document.getElementById("signature-section");
  const showSignature = currentUnit !== "scba" || Boolean(draft && (draft.signatureVisible || draft.signature));
  signature.classList.toggle("hidden", !showSignature);
  initSignaturePad(draft?.signature || "");
  hydrating = false;
  updateProgress();
  document.getElementById("save-state").textContent = draftHasWork(draft) ? "Draft restored" : "";
}

function updateProgress() {
  const buttons = [...document.querySelectorAll("#checklist-content .check-btn")];
  const done = buttons.filter((button) => button.classList.contains("checked")).length;
  const notes = [...document.querySelectorAll("#checklist-content .notes-input")]
    .filter((field) => field.value.trim()).length;
  const el = document.getElementById("progress-text");
  const open = buttons.length - done;
  el.classList.toggle("complete", buttons.length > 0 && open === 0);
  if (!buttons.length) {
    el.textContent = "";
    return;
  }
  const noteText = notes ? ` · ${notes} note${notes === 1 ? "" : "s"}` : "";
  el.textContent = open
    ? `${done} of ${buttons.length} checked · ${open} still open${noteText}`
    : `All ${buttons.length} checked${noteText}`;
}

function collectFormData() {
  const items = {};
  const ordered = [];
  document.querySelectorAll(".item-row").forEach((row) => {
    const key = row.dataset.key;
    const entry = {
      checked: row.querySelector(".check-btn").classList.contains("checked"),
      notes: row.querySelector(".notes-input").value.trim()
    };
    items[key] = entry;
    ordered.push({
      key,
      section: row.dataset.section,
      label: row.dataset.label,
      checked: entry.checked,
      notes: entry.notes
    });
  });

  let signature = "";
  if (signaturePad?.dirty) signature = signaturePad.canvas.toDataURL("image/jpeg", 0.82);
  else if (signaturePad?.pending) signature = signaturePad.pending;

  const signatureSection = document.getElementById("signature-section");
  return {
    items,
    ordered,
    completedBy: document.getElementById("completed-by").value.trim(),
    date: document.getElementById("check-date").value,
    signature,
    signatureVisible: Boolean(signatureSection && !signatureSection.classList.contains("hidden")),
    unit: currentUnit,
    unitName: checklists[currentUnit]?.name || currentUnit,
    timestamp: new Date().toISOString()
  };
}

function scheduleSave() {
  if (hydrating || !currentUnit) return;
  document.getElementById("save-state").textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 250);
}

function saveDraft() {
  if (hydrating || !currentUnit) return false;
  const data = collectFormData();
  const draft = {
    items: data.items,
    completedBy: data.completedBy,
    date: data.date,
    signature: data.signature,
    signatureVisible: data.signatureVisible,
    scbaPackCount,
    savedAt: data.timestamp
  };
  const keep = draftHasWork(draft);
  try {
    if (data.completedBy) localStorage.setItem(NAME_KEY, data.completedBy);
    if (keep) localStorage.setItem(draftKey(currentUnit), JSON.stringify(draft));
    else localStorage.removeItem(draftKey(currentUnit));
    document.getElementById("save-state").textContent = keep ? "Saved on this device" : "";
  } catch (error) {
    document.getElementById("save-state").textContent = "This browser could not store the draft";
  }
  return keep;
}

function clearForm() {
  if (!currentUnit) return;
  if (!confirm("Clear this check and delete the saved draft?")) return;
  const name = document.getElementById("completed-by").value;
  try {
    localStorage.removeItem(draftKey(currentUnit));
  } catch (error) {
    /* storage may be unavailable */
  }
  loadChecklist(currentUnit, { skipDraft: true, keepName: name });
  toast("Check cleared");
}

function fileBase(data) {
  const name = (data.unitName || "check").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  return `Gillespie_${name}_${data.date || "undated"}`;
}

function drawCheck(doc, x, y) {
  doc.setDrawColor(22, 120, 60);
  doc.setLineWidth(0.6);
  doc.line(x + 0.7, y - 0.5, x + 1.6, y + 0.6);
  doc.line(x + 1.6, y + 0.6, x + 3.4, y - 2.1);
}

function exportPDF() {
  if (!currentUnit) {
    toast("Select a unit first.");
    return;
  }
  const button = document.getElementById("export-pdf-btn");
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Making PDF…";
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast("PDF library did not load. Reload and try again.");
      return;
    }
    const data = collectFormData();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const notesX = margin + 108;
    const notesW = pageW - margin - notesX;

    function paintHeader() {
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, pageW, 24, "F");
      let textX = margin;
      if (logoData) {
        try {
          doc.addImage(logoData, "PNG", margin, 4, 16, 16);
          textX = margin + 20;
        } catch (error) {
          textX = margin;
        }
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("GILLESPIE FIRE DEPT", textX, 11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Monthly apparatus and SCBA check", textX, 17);
    }

    paintHeader();
    let y = 32;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const titleLines = doc.splitTextToSize(data.unitName || "Apparatus check", pageW - margin * 2);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Date: ${formatDate(data.date)}     Completed by: ${data.completedBy || "—"}`, margin, y);
    y += 6;

    const checkedCount = data.ordered.filter((item) => item.checked).length;
    const noteCount = data.ordered.filter((item) => item.notes).length;
    const openCount = data.ordered.length - checkedCount;
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text(`${checkedCount} checked · ${openCount} open · ${noteCount} with notes`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 7;

    let section = "";
    data.ordered.forEach((item, index) => {
      const labelLines = doc.splitTextToSize(item.label, 96);
      const noteLines = item.notes ? doc.splitTextToSize(item.notes, notesW) : [];
      const rowH = Math.max(labelLines.length, noteLines.length, 1) * 4.2 + 2.6;
      const sectionH = item.section !== section ? 7 : 0;
      if (y + sectionH + rowH > pageH - 16) {
        doc.addPage();
        y = 16;
      }
      if (item.section !== section) {
        section = item.section;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(160, 30, 48);
        doc.text(section.toUpperCase(), margin, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }

      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 3.2, pageW - margin * 2, rowH, "F");
      }

      doc.setDrawColor(90, 90, 90);
      doc.setLineWidth(0.3);
      doc.rect(margin, y - 2.6, 4, 4);
      if (item.checked) drawCheck(doc, margin, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(labelLines, margin + 6, y);
      if (noteLines.length) {
        doc.setTextColor(70, 70, 70);
        doc.text(noteLines, notesX, y);
        doc.setTextColor(0, 0, 0);
      }
      y += rowH;
    });

    if (y > pageH - 52) {
      doc.addPage();
      y = 16;
    }
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SIGNATURE", margin, y);
    y += 3;

    if (data.signature) {
      try {
        const signatureFormat = data.signature.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(data.signature, signatureFormat, margin, y, 62, 21);
        y += 25;
      } catch (error) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.text("Signature could not be placed on the PDF.", margin, y + 6);
        y += 12;
      }
    } else {
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin, y, 62, 18);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("No signature", margin + 2, y + 10);
      doc.setTextColor(0, 0, 0);
      y += 22;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Printed name: ${data.completedBy || "—"}`, margin, y);
    y += 5;
    doc.text(`Date: ${formatDate(data.date)}`, margin, y);

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Gillespie Fire Department · Monthly apparatus check", margin, pageH - 8);
      doc.text(`Page ${page} of ${pages}`, pageW - margin, pageH - 8, { align: "right" });
    }

    doc.save(`${fileBase(data)}.pdf`);
    toast(openCount ? `PDF downloaded. ${openCount} still open.` : "PDF downloaded.");
  } catch (error) {
    console.error(error);
    toast("PDF export failed. Try again.");
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

document.addEventListener("DOMContentLoaded", init);
