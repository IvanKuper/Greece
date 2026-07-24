const params = new URLSearchParams(location.search);
const token = params.get("token");
const app = document.getElementById("app");
const money = (v) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(v || 0));
const esc = (v) =>
  String(v ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
const STATUS_HE = {
  draft: "טיוטה", sent: "נשלח", paid: "שולם", overdue: "באיחור", cancelled: "בוטל",
  accepted: "אושר", rejected: "נדחה", expired: "פג תוקף", converted: "הומר לחשבונית",
  planning: "בתכנון", active: "פעיל", on_hold: "בהמתנה", completed: "הושלם",
  open: "פתוח", in_progress: "בטיפול", resolved: "נפתר", closed: "סגור",
  scheduled: "מתוזמן", retired: "הוצא משימוש", inactive: "לא פעיל",
};
const st = (s) => STATUS_HE[s] || s;

async function load() {
  if (!token) {
    app.innerHTML = '<p class="muted">קישור לא תקין.</p>';
    return;
  }
  try {
    const r = await fetch(`/api/v1/public/portal/${encodeURIComponent(token)}`);
    if (!r.ok) {
      app.innerHTML = '<h1>האזור האישי לא נמצא</h1><p class="muted">ייתכן שהקישור שגוי. פנו אלינו לקבלת קישור מעודכן.</p>';
      return;
    }
    render(await r.json());
  } catch {
    app.innerHTML = '<p class="muted">אירעה שגיאה בטעינת הנתונים. נסו לרענן את הדף.</p>';
  }
}

function invoiceRow(inv) {
  return `<tr>
    <td>${esc(inv.number)}<br><small class="muted">${esc(inv.issue_date)}</small></td>
    <td><span class="badge ${esc(inv.status)}">${st(inv.status)}</span></td>
    <td>${money(inv.total)}</td>
    <td><a class="link" href="/api/v1/public/portal/${encodeURIComponent(token)}/invoices/${inv.id}/pdf" target="_blank" rel="noopener">PDF</a></td>
  </tr>`;
}

function quoteRow(q) {
  return `<tr>
    <td>${esc(q.title || q.number)}<br><small class="muted">${esc(q.number)}</small></td>
    <td><span class="badge ${esc(q.status)}">${st(q.status)}</span></td>
    <td>${money(q.total)}</td>
    <td><a class="link" href="/quote.html?token=${esc(q.public_token)}">צפייה</a></td>
  </tr>`;
}

function projectRow(p) {
  return `<tr>
    <td>${esc(p.name)}${p.deadline ? `<br><small class="muted">יעד: ${esc(p.deadline)}</small>` : ""}</td>
    <td><span class="badge ${esc(p.status)}">${st(p.status)}</span></td>
    <td><div class="progress"><i style="width:${p.progress || 0}%"></i></div><small class="muted">${p.progress || 0}%</small></td>
  </tr>`;
}

function assetRow(a) {
  return `<tr>
    <td>${esc(a.name)}${a.asset_tag ? `<br><small class="muted">${esc(a.asset_tag)}</small>` : ""}</td>
    <td><span class="badge ${esc(a.status)}">${st(a.status)}</span></td>
    <td>${a.next_service_at ? `<small class="muted">שירות הבא: ${esc(a.next_service_at)}</small>` : ""}</td>
  </tr>`;
}

function requestRow(r) {
  return `<tr>
    <td>${esc(r.title)}<br><small class="muted">${esc(r.number)}</small></td>
    <td><span class="badge ${esc(r.status)}">${st(r.status)}</span></td>
    <td></td>
  </tr>`;
}

function workOrderRow(w) {
  return `<tr>
    <td>${esc(w.title)}<br><small class="muted">${esc(w.number)}</small></td>
    <td><span class="badge ${esc(w.status)}">${st(w.status)}</span></td>
    <td>${w.scheduled_start ? `<small class="muted">${esc(w.scheduled_start.slice(0, 16).replace("T", " "))}</small>` : ""}</td>
  </tr>`;
}

function render({ customer, invoices, quotes, projects, assets, serviceRequests, workOrders, company }) {
  app.innerHTML = `
    <div>
      <span class="muted">${esc(company.name || "GREECE")}</span>
      <h1>שלום, ${esc(customer.contact_name || customer.company_name)}</h1>
      <p class="muted">${esc(customer.company_name)}</p>
    </div>
    <div class="card">
      <h2>חשבוניות</h2>
      ${invoices.length ? `<table>${invoices.map(invoiceRow).join("")}</table>` : '<p class="muted">אין חשבוניות עדיין.</p>'}
    </div>
    <div class="card">
      <h2>הצעות מחיר</h2>
      ${quotes.length ? `<table>${quotes.map(quoteRow).join("")}</table>` : '<p class="muted">אין הצעות מחיר עדיין.</p>'}
    </div>
    <div class="card">
      <h2>פרויקטים</h2>
      ${projects.length ? `<table>${projects.map(projectRow).join("")}</table>` : '<p class="muted">אין פרויקטים פעילים.</p>'}
    </div>
    <div class="card">
      <h2>ציוד</h2>
      ${assets.length ? `<table>${assets.map(assetRow).join("")}</table>` : '<p class="muted">אין ציוד רשום.</p>'}
    </div>
    <div class="card">
      <h2>קריאות שירות</h2>
      ${serviceRequests.length ? `<table>${serviceRequests.map(requestRow).join("")}</table>` : '<p class="muted">אין קריאות שירות עדיין.</p>'}
      <div id="requestFormArea" style="margin-top:16px"></div>
    </div>
    <div class="card">
      <h2>צווי עבודה</h2>
      ${workOrders.length ? `<table>${workOrders.map(workOrderRow).join("")}</table>` : '<p class="muted">אין צווי עבודה עדיין.</p>'}
    </div>
  `;
  renderRequestForm();
}

function renderRequestForm() {
  const area = document.getElementById("requestFormArea");
  area.innerHTML = `
    <button class="btn-accept" id="newRequestBtn" type="button" style="width:auto;padding:10px 20px">+ פתח קריאת שירות חדשה</button>
    <div id="newRequestForm" style="display:none;margin-top:14px">
      <div class="field"><label for="reqTitle">כותרת</label><input id="reqTitle" type="text" /></div>
      <div class="field"><label for="reqDescription">תיאור</label><input id="reqDescription" type="text" /></div>
      <div id="reqError"></div>
      <button class="btn-accept" id="submitRequestBtn" type="button">שלח קריאה</button>
    </div>
  `;
  document.getElementById("newRequestBtn").onclick = () => {
    document.getElementById("newRequestForm").style.display = "block";
    document.getElementById("newRequestBtn").style.display = "none";
  };
  document.getElementById("submitRequestBtn").onclick = submitServiceRequest;
}

async function submitServiceRequest() {
  const title = document.getElementById("reqTitle").value.trim();
  const description = document.getElementById("reqDescription").value.trim();
  const errEl = document.getElementById("reqError");
  if (!title) {
    errEl.textContent = "נא להזין כותרת";
    return;
  }
  const btn = document.getElementById("submitRequestBtn");
  btn.disabled = true;
  try {
    const r = await fetch(`/api/v1/public/portal/${encodeURIComponent(token)}/service-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || "שגיאה");
    load();
  } catch (e) {
    errEl.textContent = e.message;
    btn.disabled = false;
  }
}

load();
