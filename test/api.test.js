const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const app = require("../src/app");
const { db } = require("../src/db");
let server, base, token, adminId, sessionId;
const auth = () => ({ authorization: "Bearer " + token }),
  json = (body) => ({ "content-type": "application/json", ...auth() });
test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(base + "/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "admin@greece.co.il",
      password: "Admin123!",
    }),
  });
  assert.equal(r.status, 200);
  const x = await r.json();
  token = x.token;
  adminId = x.user.id;
  sessionId = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url"),
  ).sid;
  assert.equal(x.user.role, "super_admin");
});
test.after(() => {
  db.prepare("DELETE FROM sessions WHERE id=?").run(sessionId);
  server.close();
});
test("rejects protected API without credentials", async () =>
  assert.equal((await fetch(base + "/api/v1/customers")).status, 401));
test("returns executive dashboard", async () => {
  const r = await fetch(base + "/api/v1/dashboard", {
      headers: { authorization: "Bearer " + token },
    }),
    x = await r.json();
  assert.equal(r.status, 200);
  assert.equal(typeof x.kpis.revenue, "number");
  assert.ok(Array.isArray(x.pipeline));
});
test("supports paginated CRM search", async () => {
  const r = await fetch(
      base + "/api/v1/customers?page=1&limit=10&search=Alpha",
      { headers: { authorization: "Bearer " + token } },
    ),
    x = await r.json();
  assert.equal(r.status, 200);
  assert.ok(x.data.some((c) => c.company_name === "Alpha Industries"));
  assert.equal(x.pagination.page, 1);
});
test("serves public jobs and CRM shell", async () => {
  const jobs = await fetch(base + "/api/v1/public/jobs"),
    applications = await fetch(base + "/applications", { redirect: "manual" }),
    crm = await fetch(base + "/crm"),
    crmDeep = await fetch(base + "/crm/customers");
  assert.equal(jobs.status, 200);
  assert.ok(Array.isArray(await jobs.json()));
  assert.equal(applications.status, 200);
  assert.match(await applications.text(), /site\.js/);
  assert.match(await crm.text(), /Greece Business Platform/);
  assert.match(await crmDeep.text(), /Greece Business Platform/);
});
test("publishes editable business information", async () => {
  const r = await fetch(base + "/api/v1/public/business"),
    x = await r.json();
  assert.equal(r.status, 200);
  assert.match(x.company_name, /GREECE/);
  assert.match(x.email, /@/);
  assert.ok(x.phone);
});
test("serves Customer 360 and business modules", async () => {
  const customer = db.prepare("SELECT id FROM customers LIMIT 1").get();
  for (const url of [
    `/api/v1/customers/${customer.id}/360`,
    "/api/v1/calendar_events",
    "/api/v1/automation_rules",
    "/api/v1/integrations",
    "/api/v1/security/overview",
    "/api/v1/monitoring/overview",
    "/api/v1/portal/me",
  ]) {
    const r = await fetch(base + url, { headers: auth() });
    assert.equal(r.status, 200, `${url} returned ${r.status}`);
  }
  const x = await (
    await fetch(base + `/api/v1/customers/${customer.id}/360`, {
      headers: auth(),
    })
  ).json();
  assert.equal(x.customer.id, customer.id);
  assert.ok(Array.isArray(x.activities));
});
test("creates and decides an approval request", async () => {
  const created = await fetch(base + "/api/v1/approval_requests", {
    method: "POST",
    headers: json(),
    body: JSON.stringify({
      entity_type: "transaction",
      action: "API test approval",
      requested_by: adminId,
      assigned_role: "administrator",
      status: "pending",
      amount: 100,
      reason: "Automated test",
    }),
  });
  assert.equal(created.status, 201);
  const row = await created.json(),
    decision = await fetch(base + `/api/v1/approvals/${row.id}/decision`, {
      method: "POST",
      headers: json(),
      body: JSON.stringify({ decision: "approved", notes: "Verified" }),
    });
  assert.equal(decision.status, 200);
  assert.equal((await decision.json()).status, "approved");
  await fetch(base + `/api/v1/approval_requests/${row.id}`, {
    method: "DELETE",
    headers: auth(),
  });
  db.prepare(
    "DELETE FROM notifications WHERE message='API test approval was approved'",
  ).run();
});
test("submits and decides employee leave", async () => {
  const created = await fetch(base + "/api/v1/portal/leave", {
    method: "POST",
    headers: json(),
    body: JSON.stringify({
      leave_type: "vacation",
      start_date: "2026-08-02",
      end_date: "2026-08-03",
      days: 2,
      reason: "Automated test",
    }),
  });
  assert.equal(created.status, 201);
  const row = await created.json(),
    decision = await fetch(base + `/api/v1/leave/${row.id}/decision`, {
      method: "POST",
      headers: json(),
      body: JSON.stringify({ decision: "approved" }),
    });
  assert.equal(decision.status, 200);
  assert.equal((await decision.json()).status, "approved");
  db.prepare("DELETE FROM leave_requests WHERE id=?").run(row.id);
  db.prepare(
    "DELETE FROM notifications WHERE message IN ('2026-08-02 to 2026-08-03','System Administrator requested 2 day(s)')",
  ).run();
});
test("opens a real-time notification stream", async () => {
  const controller = new AbortController(),
    response = await fetch(base + "/api/v1/notifications/stream", {
      headers: auth(),
      signal: controller.signal,
    });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/event-stream/);
  controller.abort();
});
test("uploads and downloads a role-protected file", async () => {
  const created = await fetch(base + "/api/v1/files", {
    method: "POST",
    headers: json(),
    body: JSON.stringify({
      name: "api-test.txt",
      data: "data:text/plain;base64,dGVzdCBmaWxl",
      access_role: "administrator",
    }),
  });
  assert.equal(created.status, 201);
  const doc = await created.json(),
    download = await fetch(base + `/api/v1/files/${doc.id}/download`, {
      headers: auth(),
    });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), "test file");
  db.prepare("DELETE FROM documents WHERE id=?").run(doc.id);
  fs.rmSync(path.join(__dirname, "..", "storage", "uploads", doc.stored_name), {
    force: true,
  });
});
test("generates valid invoice PDF and Excel report", async () => {
  const invoice = db.prepare("SELECT id FROM invoices LIMIT 1").get(),
    pdf = await fetch(base + `/api/v1/invoices/${invoice.id}/pdf`, {
      headers: auth(),
    }),
    xlsx = await fetch(base + "/api/v1/reports/business.xlsx", {
      headers: auth(),
    });
  assert.equal(pdf.status, 200);
  assert.equal(
    Buffer.from(await pdf.arrayBuffer())
      .subarray(0, 4)
      .toString(),
    "%PDF",
  );
  assert.equal(xlsx.status, 200);
  assert.equal(
    Buffer.from(await xlsx.arrayBuffer())
      .subarray(0, 2)
      .toString(),
    "PK",
  );
});
test("creates a checksum-verified backup", async () => {
  const r = await fetch(base + "/api/v1/backups", {
    method: "POST",
    headers: json(),
    body: "{}",
  });
  assert.equal(r.status, 201);
  const backup = await r.json();
  assert.equal(backup.status, "completed");
  assert.equal(backup.checksum.length, 64);
  assert.ok(
    fs.existsSync(
      path.join(__dirname, "..", "storage", "backups", backup.filename),
    ),
  );
  db.prepare("DELETE FROM backup_runs WHERE id=?").run(backup.id);
  db.prepare("DELETE FROM notifications WHERE message=?").run(
    `${backup.filename} (${Math.round(backup.size / 1024)} KB)`,
  );
  fs.rmSync(path.join(__dirname, "..", "storage", "backups", backup.filename), {
    force: true,
  });
});
test("builds and accepts a secure quotation", async () => {
  const customer = db.prepare("SELECT id FROM customers LIMIT 1").get();
  const created = await fetch(base + "/api/v1/quotes/build", {
    method: "POST",
    headers: json(),
    body: JSON.stringify({
      customer_id: customer.id,
      title: "API quotation test",
      items: [{ description: "Test service", quantity: 2, unit_price: 100 }],
    }),
  });
  assert.equal(created.status, 201);
  const quote = await created.json();
  assert.equal(quote.total, 234);
  const publicView = await fetch(
    base + `/api/v1/public/quotes/${quote.public_token}`,
  );
  assert.equal(publicView.status, 200);
  assert.equal((await publicView.json()).items.length, 1);
  const accepted = await fetch(
    base + `/api/v1/public/quotes/${quote.public_token}/accept`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signed_name: "API Customer", accept_terms: true }),
    },
  );
  assert.equal(accepted.status, 200);
  assert.equal(
    db.prepare("SELECT status FROM quotes WHERE id=?").get(quote.id).status,
    "accepted",
  );
  db.prepare("DELETE FROM quotes WHERE id=?").run(quote.id);
});
test("issues customer portal access and creates a service request", async () => {
  const customer = db.prepare("SELECT id FROM customers LIMIT 1").get();
  const access = await fetch(base + "/api/v1/customer-portal/access", {
    method: "POST",
    headers: json(),
    body: JSON.stringify({ customer_id: customer.id }),
  });
  assert.equal(access.status, 201);
  const accessData = await access.json();
  const portalUrl = new URL(accessData.url);
  const tokenValue = portalUrl.pathname.split("/").pop();
  const portal = await fetch(base + `/api/v1/public/portal/${tokenValue}`);
  assert.equal(portal.status, 200);
  const request = await fetch(
    base + `/api/v1/public/portal/${tokenValue}/requests`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "API portal request", priority: "high" }),
    },
  );
  assert.equal(request.status, 201);
  const requestData = await request.json();
  assert.match(requestData.number, /^SR-/);
  db.prepare("DELETE FROM service_requests WHERE id=?").run(requestData.id);
  db.prepare("DELETE FROM customer_portal_tokens WHERE customer_id=?").run(
    customer.id,
  );
});
test("serves operations analytics and grounded assistant answers", async () => {
  const analytics = await fetch(base + "/api/v1/analytics/operations", {
      headers: auth(),
    }),
    assistant = await fetch(base + "/api/v1/assistant", {
      method: "POST",
      headers: json(),
      body: JSON.stringify({ prompt: "What inventory is low?" }),
    });
  assert.equal(analytics.status, 200);
  assert.equal(typeof (await analytics.json()).service.openRequests, "number");
  assert.equal(assistant.status, 200);
  const answer = await assistant.json();
  assert.equal(answer.mode, "local");
  assert.ok(answer.sources.includes("inventory_items"));
  db.prepare("DELETE FROM ai_assistant_runs WHERE id=?").run(answer.runId);
});
test("creates WebAuthn registration options", async () => {
  const r = await fetch(base + "/api/v1/auth/passkeys/register/options", {
      method: "POST",
      headers: json(),
      body: "{}",
    }),
    x = await r.json();
  assert.equal(r.status, 200, JSON.stringify(x));
  assert.ok(x.challenge);
  assert.equal(x.rp.name, "GREECE Business Platform");
  db.prepare(
    "DELETE FROM webauthn_challenges WHERE user_id=? AND purpose='registration'",
  ).run(adminId);
});
