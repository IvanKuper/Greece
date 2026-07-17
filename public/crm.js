const $ = (s, p = document) => p.querySelector(s),
  $$ = (s, p = document) => [...p.querySelectorAll(s)];
const API = "/api/v1";
let token = localStorage.accessToken || "",
  user = null,
  current = "dashboard",
  page = 1,
  search = "",
  cache = {},
  notificationController = null,
  businessSettingsCache = {};
const modules = {
  dashboard: { label: "Dashboard", icon: "⌂", group: "Overview" },
  customers: {
    label: "Customers",
    icon: "◉",
    group: "CRM",
    fields: [
      "company_name",
      "contact_name",
      "email",
      "phone",
      "status",
      "address",
    ],
  },
  leads: {
    label: "Leads",
    icon: "◎",
    group: "CRM",
    fields: [
      "full_name",
      "company",
      "email",
      "phone",
      "source",
      "score",
      "stage",
      "follow_up_at",
    ],
  },
  deals: {
    label: "Deals",
    icon: "◇",
    group: "CRM",
    pipeline: true,
    fields: [
      "title",
      "value",
      "stage",
      "probability",
      "expected_close",
      "notes",
    ],
  },
  communications: {
    label: "Communications",
    icon: "✉",
    group: "CRM",
    fields: ["type", "subject", "content", "occurred_at"],
  },
  activities: {
    label: "Activity Timeline",
    icon: "◴",
    group: "CRM",
    fields: [
      "entity_type",
      "entity_id",
      "activity_type",
      "title",
      "description",
      "occurred_at",
    ],
    readOnly: true,
  },
  tasks: {
    label: "Tasks",
    icon: "✓",
    group: "Work",
    fields: [
      "title",
      "priority",
      "status",
      "due_date",
      "progress",
      "description",
    ],
  },
  projects: {
    label: "Projects",
    icon: "▦",
    group: "Work",
    fields: [
      "name",
      "status",
      "start_date",
      "deadline",
      "progress",
      "budget",
      "spent",
      "description",
    ],
  },
  calendar_events: {
    label: "Calendar",
    icon: "▣",
    group: "Work",
    special: "calendar",
    fields: [
      "title",
      "event_type",
      "start_at",
      "end_at",
      "location",
      "status",
      "description",
    ],
  },
  automation_rules: {
    label: "Automations",
    icon: "⌁",
    group: "Work",
    special: "automations",
    fields: [
      "name",
      "entity_type",
      "trigger_event",
      "conditions",
      "actions",
      "active",
    ],
  },
  approval_requests: {
    label: "Approvals",
    icon: "✓",
    group: "Work",
    special: "approvals",
    fields: [
      "entity_type",
      "action",
      "assigned_role",
      "status",
      "amount",
      "reason",
      "created_at",
    ],
  },
  employees: {
    label: "Employees",
    icon: "♙",
    group: "People",
    fields: [
      "employee_number",
      "full_name",
      "email",
      "phone",
      "position",
      "salary",
      "status",
      "hire_date",
    ],
  },
  attendance: {
    label: "Attendance",
    icon: "◷",
    group: "People",
    fields: ["employee_id", "date", "check_in", "check_out", "status", "notes"],
  },
  leave_requests: {
    label: "Leave Requests",
    icon: "◫",
    group: "People",
    fields: [
      "employee_id",
      "leave_type",
      "start_date",
      "end_date",
      "days",
      "status",
      "reason",
    ],
  },
  payroll: {
    label: "Payroll",
    icon: "◫",
    group: "People",
    fields: [
      "employee_id",
      "month",
      "base_salary",
      "bonuses",
      "deductions",
      "tax",
      "net_salary",
      "status",
    ],
  },
  portal: {
    label: "Employee Portal",
    icon: "♧",
    group: "People",
    special: "portal",
  },
  transactions: {
    label: "Transactions",
    icon: "↔",
    group: "Finance",
    fields: ["type", "category", "amount", "date", "description", "vat_rate"],
  },
  invoices: {
    label: "Invoices",
    icon: "▤",
    group: "Finance",
    fields: [
      "number",
      "customer_id",
      "issue_date",
      "due_date",
      "subtotal",
      "vat_rate",
      "total",
      "status",
      "notes",
    ],
  },
  bank_accounts: {
    label: "Bank Accounts",
    icon: "▰",
    group: "Finance",
    fields: ["name", "bank", "account_number", "balance", "currency"],
  },
  reports: {
    label: "Reports & Exports",
    icon: "▥",
    group: "Finance",
    special: "reports",
  },
  job_listings: {
    label: "Job Listings",
    icon: "⚑",
    group: "Recruiting",
    fields: [
      "title",
      "location",
      "category",
      "employment_type",
      "salary_range",
      "status",
      "description",
      "requirements",
    ],
  },
  job_applications: {
    label: "Applications",
    icon: "◌",
    group: "Recruiting",
    fields: [
      "job_title",
      "full_name",
      "email",
      "phone",
      "status",
      "experience",
    ],
  },
  documents: {
    label: "Secure Files",
    icon: "□",
    group: "System",
    fields: ["name", "mime_type", "entity_type", "entity_id", "access_role"],
  },
  notifications: {
    label: "Notifications",
    icon: "♢",
    group: "System",
    fields: ["type", "title", "message", "link", "read_at"],
  },
  integrations: {
    label: "Integrations",
    icon: "⌘",
    group: "System",
    special: "integrations",
  },
  security: {
    label: "Security Center",
    icon: "◈",
    group: "System",
    special: "security",
  },
  monitoring: {
    label: "Monitoring",
    icon: "◉",
    group: "System",
    special: "monitoring",
  },
  backups: { label: "Backups", icon: "↻", group: "System", special: "backups" },
  settings: {
    label: "Business Settings",
    icon: "⚙",
    group: "System",
    special: "settings",
  },
  audit_logs: {
    label: "Audit Log",
    icon: "◈",
    group: "System",
    readOnly: true,
  },
  users: {
    label: "Users & Roles",
    icon: "⚙",
    group: "System",
    fields: ["name", "email", "role_id", "verified"],
    readOnly: true,
  },
};
const money = (v) =>
  new Intl.NumberFormat(document.documentElement.lang || "en", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
const date = (v) => (v ? new Date(v).toLocaleDateString() : "");
async function api(url, opt = {}) {
  let r = await fetch(API + url, {
    ...opt,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(opt.headers || {}),
    },
  });
  if (r.status === 401 && url != "/auth/refresh" && localStorage.accessToken) {
    const rr = await fetch(API + "/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (rr.ok) {
      const x = await rr.json();
      token = x.token;
      localStorage.accessToken = token;
      r = await fetch(API + url, {
        ...opt,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          ...(opt.headers || {}),
        },
      });
    }
  }
  if (!r.ok) {
    const x = await r.json().catch(() => ({}));
    throw new Error(x.error?.message || "Request failed");
  }
  return r.status === 204 ? null : r.json();
}
function loginView() {
  document.body.className = "";
  $("#app").innerHTML =
    `<div class="login"><div class="login-art"><div class="brand"><span class="brand-mark">G</span> GREECE LTD</div><h1>One platform.<br><span style="color:var(--primary2)">Total business clarity.</span></h1><p style="color:#98a4b8;max-width:560px;font-size:17px;line-height:1.7">Customers, sales, finance, people and projects—securely connected in one operating system.</p></div><div class="login-panel"><form class="login-box" id="loginForm"><span class="eyebrow">Secure workspace</span><h1 style="font-size:34px;margin:12px 0 8px">Welcome back</h1><p class="muted">Sign in to Greece Business Platform</p><div class="field"><label>Email</label><input name="email" type="email" autocomplete="username" required></div><div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div><label style="display:flex;gap:8px;align-items:center;margin:15px 0"><input name="rememberMe" type="checkbox" checked> Remember this device</label><button type="submit" class="btn" style="width:100%;padding:13px">Sign in securely</button><button type="button" class="btn secondary" style="width:100%;margin-top:9px" onclick="passkeyLogin()">Sign in with a passkey</button><button type="button" class="btn secondary" style="width:100%;margin-top:9px" onclick="forgotPassword()">Forgot password</button></form></div></div>`;
  $("#loginForm").onsubmit = login;
  handlePasswordResetLink();
}
async function login(e) {
  e.preventDefault();
  const b = Object.fromEntries(new FormData(e.target));
  b.rememberMe = !!e.target.rememberMe.checked;
  try {
    const x = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(b),
    });
    if (x.twoFactorRequired) return toast("Enter your two-factor code");
    token = x.token;
    localStorage.accessToken = token;
    user = x.user;
    appView();
  } catch (e) {
    toast(e.message);
  }
}
async function forgotPassword() {
  const email = prompt("Enter your account email:");
  if (!email) return;
  const x = await api("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  toast(
    x.developmentToken
      ? "Development reset token created"
      : "If the account exists, reset instructions were sent",
  );
}
async function handlePasswordResetLink() {
  const resetToken = new URLSearchParams(location.hash.slice(1)).get("reset");
  if (!resetToken) return;
  history.replaceState(null, "", "/crm");
  const password = prompt("Choose a new password (at least 10 characters):");
  if (!password) return;
  const confirmation = prompt("Repeat your new password:");
  if (password !== confirmation) return toast("Passwords do not match");
  try {
    await api("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token: resetToken, password }),
    });
    toast("Password updated. You can now sign in.");
  } catch (error) {
    toast(error.message);
  }
}
function sidebar() {
  const groups = {};
  for (const [k, m] of Object.entries(modules))
    (groups[m.group] ??= []).push([k, m]);
  return `<aside class="sidebar"><a class="brand" href="/"><span class="brand-mark">G</span><span class="brand-text">GREECE <small style="display:block;font-size:9px;color:#748096">BUSINESS OS</small></span></a>${Object.entries(
    groups,
  )
    .map(
      ([g, items]) =>
        `<div class="nav-group"><div class="nav-title">${g}</div>${items.map(([k, m]) => `<button class="nav-item ${current === k ? "active" : ""}" data-module="${k}"><span>${m.icon}</span><span>${m.label}</span></button>`).join("")}</div>`,
    )
    .join("")}</aside>`;
}
function appView() {
  document.body.className = document.documentElement.dir === "rtl" ? "rtl" : "";
  $("#app").innerHTML =
    `<div class="app">${sidebar()}<div class="workspace"><header class="topbar"><button class="icon-btn mobile-menu" aria-label="Open menu" onclick="$('.sidebar').classList.toggle('open')">☰</button><div class="global-search"><label class="sr-only" for="globalSearch">Search business records</label><input class="input" id="globalSearch" placeholder="Search customers, people, projects, invoices…"><div class="search-results" id="searchResults"></div></div><div class="top-actions"><button class="icon-btn" title="Theme" aria-label="Switch color theme" onclick="toggleTheme()">◐</button><button class="icon-btn" title="Language" aria-label="Switch language" onclick="toggleLanguage()">文</button><button class="icon-btn notification-button" title="Notifications" aria-label="Open notifications" onclick="openModule('notifications')">♢<span id="notificationCount" hidden></span></button><div class="avatar">${(user?.name || "A").slice(0, 1)}</div><span class="user-name"><b>${user?.name || ""}</b><small class="muted" style="display:block">${user?.role || ""}</small></span><button class="icon-btn" title="Logout" aria-label="Log out" onclick="logout()">↪</button></div></header><main class="content" id="content" tabindex="-1"></main></div></div>`;
  $$("[data-module]").forEach(
    (b) => (b.onclick = () => openModule(b.dataset.module)),
  );
  $("#globalSearch").oninput = globalSearch;
  startNotificationStream();
  render();
}
async function render() {
  history.replaceState({}, "", `/crm#${current}`);
  $$("[data-module]").forEach((b) =>
    b.classList.toggle("active", b.dataset.module === current),
  );
  if (current === "dashboard") return dashboard();
  if (modules[current].pipeline) return pipeline();
  if (modules[current].special) return specialView(modules[current].special);
  return tableView();
}
async function dashboard() {
  const el = $("#content");
  el.innerHTML = '<div class="empty">Loading executive dashboard…</div>';
  try {
    const [x, emailStatus] = await Promise.all([
        api("/dashboard"),
        api("/system/email-status"),
      ]),
      k = x.kpis;
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Executive overview</span><h1>Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${(user.name || "").split(" ")[0]}</h1><p class="muted">Here is what is happening across your business today.</p></div><button class="btn" onclick="openModule('tasks');setTimeout(openCreate,20)">＋ New task</button></div>${emailStatus.connected ? "" : `<div class="card" style="border-color:var(--yellow);margin-bottom:16px"><b>⚠ Email delivery requires configuration</b><p class="muted" style="margin:7px 0 0">Contact forms are saved in CRM, but SMTP must be connected before messages can reach ${escapeHtml(emailStatus.recipient)}.</p></div>`}<div class="kpis">${[
      ["Revenue", money(k.revenue), "↗ 12.4%"],
      ["Expenses", money(k.expenses), "Current period"],
      ["Net profit", money(k.profit), "Healthy margin"],
      ["Outstanding", money(k.outstanding), "Invoices due"],
      ["Active customers", k.customers, "Customer base"],
      ["Active projects", k.projects, "In delivery"],
      ["Employees", k.employees, "Active team"],
      ["Due today", k.tasksToday, "Tasks requiring action"],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><div class="kpi-label">${v[0]}</div><div class="kpi-value">${v[1]}</div><div class="trend">${v[2]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><section class="card"><div class="card-head"><div><h3>Cash flow</h3><span class="muted">Income vs expenses</span></div><span class="badge">Last 12 months</span></div>${cashChart(x.cashflow)}</section><section class="card"><div class="card-head"><h3>Priority tasks</h3><button class="btn secondary" onclick="openModule('tasks')">View all</button></div>${x.tasks.length ? x.tasks.map((t) => `<div class="task-row"><i class="priority ${t.priority}"></i><div style="flex:1"><b>${escapeHtml(t.title)}</b><small class="muted" style="display:block">Due ${date(t.due_date)}</small></div><span class="badge ${t.status}">${t.status}</span></div>`).join("") : '<div class="empty">No open tasks</div>'}</section></div><div class="dashboard-grid"><section class="card"><div class="card-head"><h3>Sales pipeline</h3><button class="btn secondary" onclick="openModule('deals')">Open pipeline</button></div>${x.pipeline.map((p) => `<div class="activity-row"><div style="flex:1"><b>${title(p.stage)}</b><div class="progress"><i style="width:${Math.min(100, p.count * 20)}%"></i></div></div><span>${p.count} · ${money(p.value)}</span></div>`).join("")}</section><section class="card"><div class="card-head"><h3>Notification center</h3><button class="btn secondary" onclick="openModule('notifications')">View all</button></div>${x.notifications.length ? x.notifications.map((n) => `<div class="activity-row"><span>◦</span><div><b>${escapeHtml(n.title)}</b><small class="muted" style="display:block">${escapeHtml(n.message || "")}</small></div></div>`).join("") : '<div class="empty">You are all caught up</div>'}</section></div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">${e.message}</div>`;
  }
}
async function specialView(kind) {
  const map = {
    calendar: calendarView,
    automations: automationsView,
    approvals: approvalsView,
    portal: portalView,
    reports: reportsView,
    integrations: integrationsView,
    security: securityView,
    monitoring: monitoringView,
    backups: backupsView,
    settings: settingsView,
  };
  return map[kind]?.();
}
async function calendarView() {
  const el = $("#content");
  try {
    const x = await api("/calendar_events?limit=100&sort=start_at&dir=asc");
    cache.calendar_events = x.data;
    el.innerHTML = `${pageHead("Team Calendar", "Meetings, deadlines, reminders and schedules.", `<button class="btn" onclick="openForm(null)">＋ New event</button>`)}<div class="card"><div class="calendar-list">${x.data.map((e) => `<div class="activity-row"><div class="avatar" style="border-radius:10px">${new Date(e.start_at).getDate()}</div><div style="flex:1"><b>${escapeHtml(e.title)}</b><div class="muted">${new Date(e.start_at).toLocaleString()} · ${escapeHtml(e.location || "No location")}</div></div><span class="badge ${e.status}">${title(e.event_type)}</span><button class="btn secondary" onclick="openEdit('${e.id}')">Edit</button></div>`).join("") || '<div class="empty">No events scheduled</div>'}</div></div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function automationsView() {
  const el = $("#content");
  try {
    const x = await api("/automation_rules?limit=100");
    cache.automation_rules = x.data;
    el.innerHTML = `${pageHead("CRM Automations", "Rules create follow-ups and notifications automatically.", `<button class="btn secondary" onclick="openForm(null)">＋ New rule</button><button class="btn" onclick="runAutomations()">▶ Run now</button>`)}<div class="grid3">${x.data.map((r) => `<div class="card"><div class="card-head"><span class="badge ${r.active ? "active" : "inactive"}">${r.active ? "Active" : "Paused"}</span><button class="btn secondary" onclick="openEdit('${r.id}')">Edit</button></div><h3>${escapeHtml(r.name)}</h3><p class="muted">${title(r.trigger_event)} · ${title(r.entity_type)}</p><small>${r.run_count || 0} runs · Last ${date(r.last_run_at) || "never"}</small></div>`).join("")}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function runAutomations() {
  try {
    const x = await api("/automations/run", { method: "POST", body: "{}" });
    toast(`${x.tasksCreated} follow-up task(s) created`);
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function approvalsView() {
  const el = $("#content");
  try {
    const x = await api("/approval_requests?limit=100");
    cache.approval_requests = x.data;
    el.innerHTML = `${pageHead("Approval Center", "Controlled decisions for financial and sensitive operations.", `<button class="btn" onclick="createApproval()">＋ New request</button>`)}<div class="card">${x.data.map((a) => `<div class="activity-row"><div style="flex:1"><b>${title(a.action)}</b><div class="muted">${title(a.entity_type)} · ${a.amount ? money(a.amount) : "No amount"} · ${escapeHtml(a.reason || "")}</div></div><span class="badge ${a.status}">${title(a.status)}</span>${a.status === "pending" ? `<button class="btn" onclick="decideApproval('${a.id}','approved')">Approve</button><button class="btn danger" onclick="decideApproval('${a.id}','rejected')">Reject</button>` : ""}</div>`).join("") || '<div class="empty">No approval requests</div>'}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function decideApproval(id, decision) {
  try {
    await api(`/approvals/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        notes: prompt("Decision notes (optional):") || "",
      }),
    });
    toast("Decision recorded");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function createApproval() {
  const action = prompt("What needs approval?"),
    amount = Number(prompt("Amount in ILS (optional):", "0") || 0),
    reason = prompt("Reason:") || "";
  if (!action) return;
  try {
    await api("/approval_requests", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "transaction",
        action,
        amount,
        reason,
        requested_by: user.id,
        assigned_role: "administrator",
        status: "pending",
      }),
    });
    toast("Approval request created");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function portalView() {
  const el = $("#content");
  try {
    const x = await api("/portal/me"),
      e = x.employee;
    el.innerHTML = `${pageHead("Employee Self-Service", `${e.full_name} · ${e.position || ""} · ${e.department || ""}`, `<button class="btn" onclick="requestLeave()">Request leave</button>`)}<div class="kpis">${[
      ["Employment", title(e.status)],
      ["Vacation balance", `${e.vacation_days || 0} days`],
      ["Sick balance", `${e.sick_days || 0} days`],
      ["Open tasks", x.tasks.filter((t) => t.status !== "done").length],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><div class="card"><h3>My tasks</h3>${x.tasks.map((t) => `<div class="task-row"><i class="priority ${t.priority}"></i><div><b>${escapeHtml(t.title)}</b><small class="muted"> · ${date(t.due_date)}</small></div></div>`).join("") || '<p class="muted">No tasks</p>'}</div><div class="card"><h3>Leave requests</h3>${x.leave.map((l) => `<div class="activity-row"><div><b>${title(l.leave_type)}</b><small class="muted"> · ${date(l.start_date)}–${date(l.end_date)}</small></div><span class="badge ${l.status}">${title(l.status)}</span></div>`).join("") || '<p class="muted">No requests</p>'}</div></div>`;
  } catch (e) {
    el.innerHTML = `${pageHead("Employee Self-Service", "Your account is secure.")}<div class="card empty">${escapeHtml(e.message)}<br><small>Link an employee profile with the same login email to enable this portal.</small></div>`;
  }
}
async function requestLeave() {
  const start = prompt("Start date (YYYY-MM-DD):"),
    end = prompt("End date (YYYY-MM-DD):", start);
  if (!start || !end) return;
  try {
    await api("/portal/leave", {
      method: "POST",
      body: JSON.stringify({
        leave_type: "vacation",
        start_date: start,
        end_date: end,
        days: Math.max(
          1,
          Math.round((new Date(end) - new Date(start)) / 86400000) + 1,
        ),
        reason: "Employee portal request",
      }),
    });
    toast("Leave request submitted");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function reportsView() {
  const el = $("#content");
  try {
    const f = await api("/reports/finance");
    el.innerHTML = `${pageHead("Reports & Exports", "Auditable finance, sales, HR and operations reporting.", `<button class="btn" onclick="downloadBusinessReport()">Download Excel workbook</button>`)}<div class="kpis"><div class="card kpi"><span class="kpi-label">Total income</span><div class="kpi-value">${money(f.totals.income)}</div></div><div class="card kpi"><span class="kpi-label">Total expenses</span><div class="kpi-value">${money(f.totals.expenses)}</div></div><div class="card kpi"><span class="kpi-label">Net profit</span><div class="kpi-value">${money(f.totals.income - f.totals.expenses)}</div></div></div><div class="card" style="margin-top:16px"><h3>Available report sheets</h3><p class="muted">Customers · Sales Pipeline · Finance · Invoices · Employees · Projects</p></div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function integrationsView() {
  const el = $("#content");
  try {
    const rows = await api("/integrations");
    el.innerHTML = `${pageHead("Provider Integrations", "Safe sandbox connectors ready for production credentials.")}<div class="grid3">${rows.map((x) => `<div class="card"><div class="card-head"><span class="badge ${x.status}">${title(x.status)}</span><span>${title(x.mode)}</span></div><h3>${title(x.provider)}</h3><p class="muted">${title(x.category)} integration</p><button class="btn secondary" onclick="testIntegration('${x.provider}')">Test connection</button></div>`).join("")}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function testIntegration(provider) {
  try {
    const x = await api(`/integrations/${provider}/test`, {
      method: "POST",
      body: "{}",
    });
    toast(`${title(provider)}: ${x.status}`);
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function securityView() {
  const el = $("#content");
  try {
    const [x, passkeys, sessions] = await Promise.all([
      api("/security/overview"),
      api("/auth/passkeys"),
      api("/auth/sessions"),
    ]);
    el.innerHTML = `${pageHead("Security Center", "Authentication, sessions, passkeys and sensitive activity.", `<button class="btn secondary" onclick="${user.twoFactorEnabled ? "disable2FA()" : "setup2FA()"}">${user.twoFactorEnabled ? "Disable" : "Enable"} 2FA</button><button class="btn" onclick="registerPasskey()">＋ Register passkey</button>`)}<div class="kpis">${[
      ["Failed logins (24h)", x.failedLogins24h],
      ["Active sessions", x.activeSessions],
      ["Locked accounts", x.lockedAccounts],
      ["Registered passkeys", x.passkeys],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><div class="card"><h3>My devices</h3>${sessions.map((s) => `<div class="activity-row"><div style="flex:1"><b>${escapeHtml((s.device || "Unknown").slice(0, 60))}</b><small class="muted" style="display:block">${s.ip} · ${date(s.last_used_at)}</small></div>${s.revoked_at ? '<span class="badge overdue">Revoked</span>' : `<button class="btn danger" onclick="revokeSession('${s.id}')">Revoke</button>`}</div>`).join("")}</div><div class="card"><h3>Passkeys</h3>${passkeys.map((p) => `<div class="activity-row"><div style="flex:1"><b>${escapeHtml(p.device_name)}</b><small class="muted" style="display:block">Added ${date(p.created_at)}</small></div></div>`).join("") || '<p class="muted">No passkeys registered yet.</p>'}</div></div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function revokeSession(id) {
  try {
    await api("/auth/sessions/" + id, { method: "DELETE" });
    toast("Session revoked");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function setup2FA() {
  try {
    const x = await api("/auth/2fa/setup", { method: "POST", body: "{}" });
    const code = prompt(
      `Add this secret to your authenticator app, then enter the 6-digit code:\n\n${x.secret}`,
    );
    if (!code) return;
    await api("/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    user.twoFactorEnabled = true;
    toast("Two-factor authentication enabled");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function disable2FA() {
  const code = prompt("Enter your current authenticator code:");
  if (!code) return;
  try {
    await api("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    user.twoFactorEnabled = false;
    toast("Two-factor authentication disabled");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function monitoringView() {
  const el = $("#content");
  try {
    const x = await api("/monitoring/overview");
    el.innerHTML = `${pageHead("Operations Monitoring", "Health, integrations, storage and unresolved errors.", `<button class="btn" onclick="createBackup()">Create backup</button>`)}<div class="kpis">${[
      ["System", title(x.status)],
      ["Uptime", `${Math.floor(x.uptimeSeconds / 60)} min`],
      ["Database", `${Math.round(x.database.size / 1024)} KB`],
      ["Unresolved events", x.unresolvedEvents.length],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="card" style="margin-top:16px"><h3>Provider health</h3>${x.integrations.map((i) => `<div class="activity-row"><div style="flex:1"><b>${title(i.provider)}</b><small class="muted" style="display:block">${title(i.mode)}</small></div><span class="badge ${i.status}">${title(i.status)}</span></div>`).join("")}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function backupsView() {
  const el = $("#content");
  try {
    const rows = await api("/backups");
    el.innerHTML = `${pageHead("Backup Center", "Create and retrieve checksum-verified point-in-time database backups.", `<button class="btn" onclick="createBackup()">＋ New backup</button>`)}<div class="card">${rows.map((b) => `<div class="activity-row"><div style="flex:1"><b>${escapeHtml(b.filename)}</b><small class="muted" style="display:block">${date(b.created_at)} · ${Math.round((b.size || 0) / 1024)} KB · ${escapeHtml((b.checksum || "").slice(0, 12))}</small></div><span class="badge ${b.status}">${title(b.status)}</span>${b.status === "completed" ? `<button class="btn secondary" onclick="downloadProtected('/backups/${b.id}/download','${b.filename}')">Download</button>` : ""}</div>`).join("") || '<div class="empty">No backups yet</div>'}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function createBackup() {
  try {
    toast("Creating backup…");
    await api("/backups", { method: "POST", body: "{}" });
    toast("Backup completed");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function settingsView() {
  const el = $("#content");
  try {
    const s = await api("/business-settings");
    businessSettingsCache = s;
    el.innerHTML = `${pageHead("Business Settings", "Generated values can be replaced with your real company information.")}<div class="grid3">${Object.entries(
      s,
    )
      .map(
        ([k, v]) =>
          `<div class="card"><span class="kpi-label">${title(k)}</span><p style="font-size:16px;margin:10px 0;min-height:42px">${escapeHtml(v)}</p><button class="btn secondary" onclick="editSetting('${k}')">Edit</button></div>`,
      )
      .join("")}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function editSetting(key) {
  const value = prompt(
    `Update ${title(key)}:`,
    businessSettingsCache[key] || "",
  );
  if (value === null) return;
  try {
    await api("/business-settings/" + key, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
    toast("Setting updated");
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function customer360(customerId) {
  const el = $("#content");
  el.innerHTML = '<div class="empty">Loading customer workspace…</div>';
  try {
    const x = await api(`/customers/${customerId}/360`),
      c = x.customer;
    el.innerHTML = `${pageHead(c.company_name, `${c.contact_name || ""} · ${c.email || ""} · ${c.phone || ""}`, `<button class="btn secondary" onclick="openModule('customers')">← Customers</button><button class="btn" onclick="addCustomerContact('${c.id}')">＋ Contact</button><button class="btn secondary" onclick="sendWhatsApp('${c.id}','${escapeJs(c.phone || "")}')">WhatsApp</button>`)}<div class="kpis">${[
      [
        "Pipeline",
        money(x.deals.reduce((n, d) => n + Number(d.value || 0), 0)),
      ],
      ["Projects", x.projects.length],
      [
        "Invoices",
        money(x.invoices.reduce((n, i) => n + Number(i.total || 0), 0)),
      ],
      ["Open tasks", x.tasks.filter((t) => t.status !== "done").length],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><section class="card"><div class="card-head"><h3>Contacts</h3></div>${x.contacts.map((p) => `<div class="activity-row"><div style="flex:1"><b>${escapeHtml(p.name)}</b><small class="muted" style="display:block">${escapeHtml(p.title || "")} · ${escapeHtml(p.email || "")} · ${escapeHtml(p.phone || "")}</small></div>${p.primary_contact ? '<span class="badge active">Primary</span>' : ""}</div>`).join("") || '<p class="muted">No additional contacts yet.</p>'}</section><section class="card"><h3>Recent activity</h3>${
      x.activities
        .concat(
          x.communications.map((a) => ({
            ...a,
            title: a.subject,
            description: a.content,
            occurred_at: a.occurred_at,
          })),
        )
        .sort((a, b) =>
          String(b.occurred_at).localeCompare(String(a.occurred_at)),
        )
        .slice(0, 10)
        .map(
          (a) =>
            `<div class="activity-row"><span>◦</span><div><b>${escapeHtml(a.title || a.type)}</b><small class="muted" style="display:block">${escapeHtml(a.description || "")} · ${date(a.occurred_at)}</small></div></div>`,
        )
        .join("") || '<p class="muted">Activity will appear here.</p>'
    }</section></div><div class="grid3" style="margin-top:16px"><section class="card"><h3>Deals</h3>${miniRows(x.deals, "title", "value")}</section><section class="card"><h3>Projects</h3>${miniRows(x.projects, "name", "status")}</section><section class="card"><h3>Invoices</h3>${miniRows(x.invoices, "number", "total")}</section></div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
function miniRows(rows, main, detail) {
  return (
    rows
      .slice(0, 6)
      .map(
        (r) =>
          `<div class="activity-row"><div style="flex:1"><b>${escapeHtml(r[main] || "")}</b></div><span>${["value", "total", "amount"].includes(detail) ? money(r[detail]) : title(r[detail])}</span></div>`,
      )
      .join("") || '<p class="muted">No records yet.</p>'
  );
}
async function addCustomerContact(customerId) {
  const name = prompt("Contact name:");
  if (!name) return;
  const email = prompt("Email (optional):") || "",
    phone = prompt("Phone (optional):") || "";
  try {
    await api(`/customers/${customerId}/contacts`, {
      method: "POST",
      body: JSON.stringify({ name, email, phone }),
    });
    toast("Contact added");
    customer360(customerId);
  } catch (e) {
    toast(e.message);
  }
}
async function sendWhatsApp(customerId, phone) {
  const message = prompt(
    "Sandbox WhatsApp message:",
    `Hello, this is GREECE Maintenance & Staffing regarding your account.`,
  );
  if (!message) return;
  try {
    const x = await api("/integrations/whatsapp/jobs", {
      method: "POST",
      body: JSON.stringify({
        job_type: "send_message",
        payload: { customer_id: customerId, phone, message },
      }),
    });
    toast(`WhatsApp sandbox job ${x.status}`);
  } catch (e) {
    toast(e.message);
  }
}
function openFileUpload() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><form class="modal" id="fileForm"><div class="card-head"><div><span class="eyebrow">Secure storage</span><h2>Upload a file</h2></div><button type="button" class="icon-btn" onclick="$('#modal').remove()">×</button></div><div class="field"><label for="secureFile">File (PDF, image, text, CSV or XLSX; max 10 MB)</label><input id="secureFile" name="file" type="file" required></div><div class="form-grid"><div class="field"><label>Related record type</label><select name="entity_type"><option value="">General</option><option value="customer">Customer</option><option value="project">Project</option><option value="employee">Employee</option></select></div><div class="field"><label>Related record ID</label><input name="entity_id"></div><div class="field"><label>Minimum access role</label><select name="access_role"><option>employee</option><option>manager</option><option>administrator</option></select></div></div><div class="modal-actions"><button type="button" class="btn secondary" onclick="$('#modal').remove()">Cancel</button><button class="btn">Upload securely</button></div></form></div>`,
  );
  $("#fileForm").onsubmit = uploadFile;
}
async function uploadFile(e) {
  e.preventDefault();
  const form = e.target,
    file = form.file.files[0];
  if (!file) return;
  try {
    toast("Uploading…");
    const data = await fileToDataUrl(file);
    await api("/files", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        data,
        entity_type: form.entity_type.value || null,
        entity_id: form.entity_id.value || null,
        access_role: form.access_role.value,
      }),
    });
    $("#modal").remove();
    toast("File uploaded");
    render();
  } catch (error) {
    toast(error.message);
  }
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}
async function downloadProtected(url, filename) {
  try {
    const r = await fetch(API + url, {
      credentials: "include",
      headers: { Authorization: "Bearer " + token },
    });
    if (!r.ok)
      throw new Error(
        (await r.json().catch(() => ({}))).error?.message || "Download failed",
      );
    const blob = await r.blob(),
      href = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = href;
    a.download = filename || "download";
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  } catch (e) {
    toast(e.message);
  }
}
function downloadBusinessReport() {
  return downloadProtected(
    "/reports/business.xlsx",
    "greece-business-report.xlsx",
  );
}
function updateNotificationBadge(rows) {
  const count = rows.filter((n) => !n.read_at).length,
    b = $("#notificationCount");
  if (!b) return;
  b.textContent = count > 99 ? "99+" : count;
  b.hidden = !count;
}
async function startNotificationStream() {
  notificationController?.abort();
  const controller = new AbortController();
  notificationController = controller;
  try {
    const initial = await api("/notifications?limit=100");
    updateNotificationBadge(initial.data);
    const response = await fetch(API + "/notifications/stream", {
      headers: { Authorization: "Bearer " + token },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error("Stream unavailable");
    const reader = response.body.getReader(),
      decoder = new TextDecoder();
    let buffer = "";
    while (!controller.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        const data = event
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6);
        if (data) updateNotificationBadge(JSON.parse(data));
      }
    }
  } catch (e) {
    if (!controller.signal.aborted)
      setTimeout(() => {
        if (notificationController === controller) startNotificationStream();
      }, 5000);
  }
}
const b64urlToBytes = (value) =>
  Uint8Array.from(
    atob(
      String(value)
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(String(value).length / 4) * 4, "="),
    ),
    (c) => c.charCodeAt(0),
  );
const bytesToB64url = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
function prepareRegistrationOptions(o) {
  o.challenge = b64urlToBytes(o.challenge);
  o.user.id = b64urlToBytes(o.user.id);
  o.excludeCredentials = (o.excludeCredentials || []).map((c) => ({
    ...c,
    id: b64urlToBytes(c.id),
  }));
  return o;
}
function prepareAuthenticationOptions(o) {
  o.challenge = b64urlToBytes(o.challenge);
  o.allowCredentials = (o.allowCredentials || []).map((c) => ({
    ...c,
    id: b64urlToBytes(c.id),
  }));
  return o;
}
function serializeCredential(c) {
  const response = { clientDataJSON: bytesToB64url(c.response.clientDataJSON) };
  for (const k of [
    "attestationObject",
    "authenticatorData",
    "signature",
    "userHandle",
  ])
    if (c.response[k]) response[k] = bytesToB64url(c.response[k]);
  if (c.response.getTransports)
    response.transports = c.response.getTransports();
  return {
    id: c.id,
    rawId: bytesToB64url(c.rawId),
    type: c.type,
    authenticatorAttachment: c.authenticatorAttachment,
    clientExtensionResults: c.getClientExtensionResults(),
    response,
  };
}
async function registerPasskey() {
  if (!window.PublicKeyCredential)
    return toast("Passkeys are not supported by this browser");
  try {
    const options = prepareRegistrationOptions(
        await api("/auth/passkeys/register/options", {
          method: "POST",
          body: "{}",
        }),
      ),
      credential = await navigator.credentials.create({ publicKey: options }),
      device_name =
        prompt(
          "Name this passkey/device:",
          navigator.platform || "My device",
        ) || "My device";
    await api("/auth/passkeys/register/verify", {
      method: "POST",
      body: JSON.stringify({
        response: serializeCredential(credential),
        device_name,
      }),
    });
    toast("Passkey registered");
    render();
  } catch (e) {
    toast(
      e.name === "NotAllowedError"
        ? "Passkey registration was cancelled"
        : e.message,
    );
  }
}
async function passkeyLogin() {
  if (!window.PublicKeyCredential)
    return toast("Passkeys are not supported by this browser");
  const email = prompt("Account email:", "admin@greece.co.il");
  if (!email) return;
  try {
    const options = prepareAuthenticationOptions(
        await api("/auth/passkeys/options", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      ),
      credential = await navigator.credentials.get({ publicKey: options }),
      x = await api("/auth/passkeys/verify", {
        method: "POST",
        body: JSON.stringify({ response: serializeCredential(credential) }),
      });
    token = x.token;
    localStorage.accessToken = token;
    user = x.user;
    appView();
  } catch (e) {
    toast(
      e.name === "NotAllowedError"
        ? "Passkey sign-in was cancelled"
        : e.message,
    );
  }
}
function pageHead(titleText, desc, actions = "") {
  return `<div class="page-head"><div><span class="eyebrow">Business OS</span><h1>${titleText}</h1><p class="muted">${desc}</p></div>${actions}</div>`;
}
function errorView(e) {
  return `<div class="empty">${escapeHtml(e.message)}</div>`;
}
function cashChart(rows) {
  if (!rows.length) rows = [{ month: "Now", income: 1, expenses: 0 }];
  const max = Math.max(...rows.flatMap((x) => [x.income, x.expenses]), 1);
  return `<div class="chart">${rows.map((r) => `<div class="bar-group"><i class="bar" style="height:${(r.income / max) * 100}%" title="Income ${money(r.income)}"></i><i class="bar expense" style="height:${(r.expenses / max) * 100}%" title="Expenses ${money(r.expenses)}"></i><span class="bar-label">${r.month}</span></div>`).join("")}</div><div style="display:flex;gap:20px;margin-top:35px"><span>● <small class="muted">Income</small></span><span style="color:var(--blue)">● <small class="muted">Expenses</small></span></div>`;
}
async function tableView() {
  const el = $("#content"),
    m = modules[current];
  el.innerHTML = '<div class="empty">Loading data…</div>';
  try {
    const x = await api(
      `/${current}?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
    );
    cache[current] = x.data;
    const fields = (
      m.fields ||
      Object.keys(x.data[0] || {}).filter(
        (k) => !["id", "before_data", "after_data"].includes(k),
      )
    ).slice(0, 7);
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">${m.group}</span><h1>${m.label}</h1><p class="muted">${x.pagination.total} records · centrally managed and audited</p></div>${m.readOnly ? "" : `<button class="btn" onclick="openCreate()">＋ Add ${m.label.replace(/s$/, "")}</button>`}</div><div class="toolbar"><input class="input" value="${escapeHtml(search)}" placeholder="Search ${m.label.toLowerCase()}…" onkeydown="if(event.key==='Enter'){search=this.value;page=1;render()}"><button class="btn secondary" onclick="search=$('.toolbar .input').value;page=1;render()">Filter</button><button class="btn secondary" onclick="exportCsv()">⇩ Export CSV</button>${current === "invoices" ? '<button class="btn secondary" onclick="downloadBusinessReport()">Export Excel</button>' : ""}</div><section class="card table-card"><div class="table-scroll"><table><thead><tr>${fields.map((f) => `<th>${title(f)}</th>`).join("")}<th>Actions</th></tr></thead><tbody>${x.data.map((r) => `<tr>${fields.map((f) => `<td>${cell(f, r[f])}</td>`).join("")}<td>${rowActions(r, m)}</td></tr>`).join("")}</tbody></table></div>${x.data.length ? "" : `<div class="empty">No ${m.label.toLowerCase()} found.</div>`}<div class="pager"><span class="muted">Page ${x.pagination.page} of ${Math.max(1, x.pagination.pages)}</span><div class="pager-buttons"><button class="btn secondary" ${page <= 1 ? "disabled" : ""} onclick="page--;render()">Previous</button><button class="btn secondary" ${page >= x.pagination.pages ? "disabled" : ""} onclick="page++;render()">Next</button></div></div></section>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">${e.message}</div>`;
  }
}
function rowActions(r, m) {
  const extra =
    current === "customers"
      ? `<button class="btn secondary" onclick="customer360('${r.id}')">360°</button> `
      : current === "invoices"
        ? `<button class="btn secondary" onclick="downloadProtected('/invoices/${r.id}/pdf','${escapeJs(r.number)}.pdf')">PDF</button> `
        : current === "documents"
          ? `<button class="btn secondary" onclick="downloadProtected('/files/${r.id}/download','${escapeJs(r.name)}')">Download</button> `
          : current === "notifications" && !r.read_at
            ? `<button class="btn secondary" onclick="markNotificationRead('${r.id}')">Mark read</button> `
            : current === "leave_requests" && r.status === "pending"
              ? `<button class="btn" onclick="decideLeave('${r.id}','approved')">Approve</button> <button class="btn danger" onclick="decideLeave('${r.id}','rejected')">Reject</button> `
              : "";
  return (
    extra +
    (m.readOnly
      ? ""
      : `<button class="btn secondary" onclick="openEdit('${r.id}')">Edit</button> <button class="btn danger" onclick="removeRecord('${r.id}')">Delete</button>`)
  );
}
async function markNotificationRead(id) {
  try {
    await api(`/notifications/${id}/read`, { method: "PATCH", body: "{}" });
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function decideLeave(id, decision) {
  try {
    await api(`/leave/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
    toast(`Leave request ${decision}`);
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function pipeline() {
  const el = $("#content");
  el.innerHTML = '<div class="empty">Loading sales pipeline…</div>';
  try {
    const x = await api("/deals?limit=100");
    cache.deals = x.data;
    const stages = ["qualification", "proposal", "negotiation", "won", "lost"];
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">CRM</span><h1>Sales pipeline</h1><p class="muted">Track value, probability and expected close across every opportunity.</p></div><button class="btn" onclick="openCreate()">＋ New deal</button></div><div class="pipeline">${stages
      .map((s) => {
        const rows = x.data.filter((d) => d.stage === s);
        return `<div class="column"><div class="column-head"><span>${title(s)}</span><span class="badge">${rows.length}</span></div>${rows.map((d) => `<div class="deal-card" onclick="openEdit('${d.id}')"><b>${escapeHtml(d.title)}</b><div class="muted" style="margin-top:5px">Close ${date(d.expected_close) || "not set"}</div><div class="deal-value">${money(d.value)}</div><div class="progress" style="margin-top:9px"><i style="width:${d.probability || 0}%"></i></div></div>`).join("")}</div>`;
      })
      .join("")}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">${e.message}</div>`;
  }
}
function openCreate() {
  if (current === "documents") return openFileUpload();
  openForm(null);
}
function openEdit(id) {
  openForm((cache[current] || []).find((x) => x.id === id));
}
function openForm(record) {
  const m = modules[current],
    fields = m.fields || [];
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><form class="modal" id="recordForm"><div class="card-head"><div><span class="eyebrow">${record ? "Update" : "Create"}</span><h2>${record ? "Edit" : "New"} ${m.label.replace(/s$/, "")}</h2></div><button type="button" class="icon-btn" onclick="$('#modal').remove()">×</button></div><div class="form-grid">${fields.map((f) => inputField(f, record?.[f])).join("")}</div><div class="modal-actions"><button type="button" class="btn secondary" onclick="$('#modal').remove()">Cancel</button><button class="btn">${record ? "Save changes" : "Create record"}</button></div></form></div>`,
  );
  $("#recordForm").onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    for (const [k, v] of Object.entries(data))
      if (
        [
          "amount",
          "value",
          "score",
          "probability",
          "progress",
          "budget",
          "spent",
          "salary",
          "base_salary",
          "bonuses",
          "deductions",
          "tax",
          "net_salary",
          "subtotal",
          "vat_rate",
          "total",
          "balance",
          "days",
          "active",
        ].includes(k)
      )
        data[k] = Number(v || 0);
    if (fields.includes("active") && !("active" in data)) data.active = 0;
    try {
      await api(`/${current}${record ? "/" + record.id : ""}`, {
        method: record ? "PATCH" : "POST",
        body: JSON.stringify(data),
      });
      $("#modal").remove();
      toast(record ? "Record updated" : "Record created");
      render();
    } catch (e) {
      toast(e.message);
    }
  };
}
function inputField(f, v = "") {
  const types = {
    email: "email",
    phone: "tel",
    date: "date",
    due_date: "date",
    issue_date: "date",
    expected_close: "date",
    start_date: "date",
    end_date: "date",
    deadline: "date",
    hire_date: "date",
    month: "month",
    follow_up_at: "datetime-local",
    occurred_at: "datetime-local",
    start_at: "datetime-local",
    end_at: "datetime-local",
  };
  const options = {
    status: [
      "active",
      "inactive",
      "scheduled",
      "completed",
      "cancelled",
      "draft",
      "sent",
      "paid",
      "overdue",
      "todo",
      "in_progress",
      "done",
      "pending",
    ],
    stage: ["new", "qualified", "proposal", "negotiation", "won", "lost"],
    priority: ["low", "medium", "high", "urgent"],
    type: ["income", "expense", "email", "phone", "meeting", "note"],
    event_type: ["meeting", "deadline", "reminder", "shift", "inspection"],
    leave_type: ["vacation", "sick", "personal", "unpaid"],
    source: ["website", "referral", "campaign", "organic", "partner"],
    currency: ["ILS", "USD", "EUR"],
    employment_type: ["full_time", "part_time", "temporary", "contract"],
  };
  if (f === "active")
    return `<div class="field"><label><input name="active" type="checkbox" value="1" ${Number(v) !== 0 ? "checked" : ""}> Active rule</label></div>`;
  if (options[f])
    return `<div class="field"><label>${title(f)}</label><select name="${f}">${options[f].map((o) => `<option ${v === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>`;
  if (
    [
      "notes",
      "description",
      "message",
      "content",
      "requirements",
      "experience",
      "performance_notes",
      "conditions",
      "actions",
      "reason",
    ].includes(f)
  )
    return `<div class="field" style="grid-column:1/-1"><label>${title(f)}</label><textarea name="${f}" rows="3">${escapeHtml(v || "")}</textarea></div>`;
  let value = v ?? "";
  if (types[f] === "datetime-local" && value)
    value = String(value).slice(0, 16);
  return `<div class="field"><label>${title(f)}</label><input name="${f}" type="${types[f] || (["amount", "value", "score", "probability", "progress", "budget", "spent", "salary", "base_salary", "bonuses", "deductions", "tax", "net_salary", "subtotal", "vat_rate", "total", "balance", "days"].includes(f) ? "number" : "text")}" value="${escapeHtml(value)}" ${["company_name", "full_name", "title", "name", "number", "start_at"].includes(f) ? "required" : ""}></div>`;
}
async function removeRecord(id) {
  if (!confirm("Delete this record? This action is logged.")) return;
  try {
    await api(`/${current}/${id}`, { method: "DELETE" });
    toast("Record deleted");
    render();
  } catch (e) {
    toast(e.message);
  }
}
function cell(k, v) {
  if (k === "status" || k === "stage" || k === "priority")
    return `<span class="badge ${v}">${title(v || "—")}</span>`;
  if (
    [
      "amount",
      "value",
      "salary",
      "total",
      "balance",
      "budget",
      "spent",
      "net_salary",
      "base_salary",
    ].includes(k)
  )
    return money(v);
  if (k.includes("date") || k.endsWith("_at")) return date(v);
  if (k === "progress" || k === "probability")
    return `<div style="min-width:100px"><div class="progress"><i style="width:${v || 0}%"></i></div><small>${v || 0}%</small></div>`;
  return escapeHtml(v ?? "—");
}
async function globalSearch(e) {
  const box = $("#searchResults"),
    q = e.target.value.trim();
  if (q.length < 2) {
    box.classList.remove("show");
    return;
  }
  try {
    const x = await api("/search?q=" + encodeURIComponent(q));
    box.innerHTML = x.length
      ? x
          .map(
            (r) =>
              `<div class="search-result" onclick="openModule('${r.type}')"><b>${escapeHtml(r.title)}</b><small class="muted" style="display:block">${title(r.type)}</small></div>`,
          )
          .join("")
      : '<div class="search-result muted">No results</div>';
    box.classList.add("show");
  } catch {}
}
function openModule(k) {
  if (!modules[k]) return;
  current = k;
  page = 1;
  search = "";
  $(".sidebar")?.classList.remove("open");
  if ($("#app .app")) {
    const old = $(".sidebar");
    old.outerHTML = sidebar();
    $$("[data-module]").forEach(
      (b) => (b.onclick = () => openModule(b.dataset.module)),
    );
  }
  render();
}
async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {}
  notificationController?.abort();
  localStorage.removeItem("accessToken");
  token = "";
  user = null;
  loginView();
}
function toggleTheme() {
  const d = document.documentElement;
  d.dataset.theme = d.dataset.theme === "dark" ? "light" : "dark";
  localStorage.theme = d.dataset.theme;
}
function toggleLanguage() {
  const d = document.documentElement,
    he = d.lang !== "he";
  d.lang = he ? "he" : "en";
  d.dir = he ? "rtl" : "ltr";
  document.body.className = he ? "rtl" : "";
  toast(he ? "הממשק הוחלף לעברית" : "Interface switched to English");
}
async function exportCsv() {
  try {
    const r = await fetch(API + `/export/${current}.csv`, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!r.ok) throw Error("Export failed");
    const blob = await r.blob(),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = current + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("CSV exported");
  } catch (e) {
    toast(e.message);
  }
}
function title(s) {
  return String(s || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function escapeHtml(v) {
  return String(v ?? "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function escapeJs(v) {
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\r\n]/g, " ");
}
function toast(s) {
  const e = $("#toast");
  if (!e) return;
  e.textContent = s;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 2700);
}
async function init() {
  document.documentElement.dataset.theme = localStorage.theme || "light";
  const deepModule = location.pathname.match(/^\/crm\/([^/?#]+)/)?.[1];
  current =
    location.hash.slice(1) ||
    (deepModule && modules[deepModule] ? deepModule : "dashboard");
  if (!token) return loginView();
  try {
    user = await api("/auth/me");
    appView();
  } catch {
    localStorage.removeItem("accessToken");
    token = "";
    loginView();
  }
}
init();
