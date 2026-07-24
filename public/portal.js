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

function render({ customer, invoices, quotes, projects, company }) {
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
  `;
}

load();
