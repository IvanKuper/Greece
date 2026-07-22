// @ts-nocheck - not yet type-annotated; mostly better-sqlite3 rows typed as
// `unknown` until query result shapes are declared. Revisit in a future milestone.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { db, id, now } = require("./db");
const {
  authenticate,
  permit,
  audit,
  userView,
  issueSession,
} = require("./auth");
const root = path.join(__dirname, ".."),
  uploadDir = path.join(root, "storage", "uploads"),
  backupDir = path.join(root, "storage", "backups");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });
const safeJson = (v, fallback = {}) => {
    try {
      return JSON.parse(v || "");
    } catch {
      return fallback;
    }
  },
  shaFile = (p) =>
    crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
function settings() {
  return Object.fromEntries(
    db
      .prepare("SELECT key,value FROM business_settings")
      .all()
      .map((x) => [x.key, x.value]),
  );
}
function notify(userId, type, title, message, link) {
  const ts = now();
  db.prepare(
    "INSERT INTO notifications(id,user_id,type,title,message,link,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
  ).run(id(), userId || null, type, title, message || "", link || "", ts, ts);
}
async function createBackup(userId) {
  const bid = id(),
    filename = `greece-${new Date().toISOString().replace(/[:.]/g, "-")}.db`,
    dest = path.join(backupDir, filename),
    created = now();
  db.prepare(
    "INSERT INTO backup_runs(id,filename,status,created_at) VALUES(?,?,?,?)",
  ).run(bid, filename, "running", created);
  try {
    await db.backup(dest);
    const size = fs.statSync(dest).size,
      checksum = shaFile(dest);
    db.prepare(
      "UPDATE backup_runs SET size=?,status=?,checksum=?,completed_at=? WHERE id=?",
    ).run(size, "completed", checksum, now(), bid);
    if (userId)
      notify(
        userId,
        "backup",
        "Backup completed",
        `${filename} (${Math.round(size / 1024)} KB)`,
        "/crm#backups",
      );
    return db.prepare("SELECT * FROM backup_runs WHERE id=?").get(bid);
  } catch (error) {
    db.prepare(
      "UPDATE backup_runs SET status=?,error=?,completed_at=? WHERE id=?",
    ).run("failed", error.message, now(), bid);
    throw error;
  }
}
function businessOSRoutes(app) {
  app.get("/api/v1/public/business", (req, res) => res.json(settings()));
  app.get(
    "/api/v1/business-settings",
    authenticate,
    permit("settings.read"),
    (req, res) => res.json(settings()),
  );
  app.put(
    "/api/v1/business-settings/:key",
    authenticate,
    permit("settings.update"),
    (req, res) => {
      const value = String(req.body.value ?? "").slice(0, 2000);
      db.prepare(
        "INSERT INTO business_settings(key,value,category,updated_by,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,category=excluded.category,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
      ).run(
        req.params.key,
        value,
        req.body.category || "general",
        req.user.sub,
        now(),
      );
      audit(req, "settings.update", "business_setting", req.params.key, null, {
        value,
      });
      res.json({ key: req.params.key, value });
    },
  );
  app.get(
    "/api/v1/customers/:id/360",
    authenticate,
    permit("crm.read"),
    (req, res) => {
      const customer = db
        .prepare("SELECT * FROM customers WHERE id=?")
        .get(req.params.id);
      if (!customer) return res.sendStatus(404);
      const all = (q, ...p) => db.prepare(q).all(...p);
      res.json({
        customer,
        contacts: all(
          "SELECT * FROM customer_contacts WHERE customer_id=? ORDER BY primary_contact DESC,name",
          customer.id,
        ),
        deals: all(
          "SELECT * FROM deals WHERE customer_id=? ORDER BY created_at DESC",
          customer.id,
        ),
        projects: all(
          "SELECT * FROM projects WHERE customer_id=? ORDER BY created_at DESC",
          customer.id,
        ),
        invoices: all(
          "SELECT * FROM invoices WHERE customer_id=? ORDER BY issue_date DESC",
          customer.id,
        ),
        tasks: all(
          "SELECT * FROM tasks WHERE customer_id=? ORDER BY due_date",
          customer.id,
        ),
        communications: all(
          "SELECT * FROM communications WHERE customer_id=? ORDER BY occurred_at DESC",
          customer.id,
        ),
        documents: all(
          "SELECT * FROM documents WHERE entity_type='customer' AND entity_id=? ORDER BY created_at DESC",
          customer.id,
        ),
        activities: all(
          "SELECT * FROM activities WHERE entity_type='customer' AND entity_id=? ORDER BY occurred_at DESC",
          customer.id,
        ),
      });
    },
  );
  app.post(
    "/api/v1/customers/:id/contacts",
    authenticate,
    permit("crm.create"),
    (req, res) => {
      const ts = now(),
        row = {
          id: id(),
          customer_id: req.params.id,
          name: req.body.name,
          title: req.body.title || "",
          email: req.body.email || "",
          phone: req.body.phone || "",
          primary_contact: req.body.primary_contact ? 1 : 0,
          created_at: ts,
          updated_at: ts,
        };
      if (!row.name)
        return res
          .status(400)
          .json({ error: { message: "Contact name required" } });
      db.prepare(
        "INSERT INTO customer_contacts VALUES(@id,@customer_id,@name,@title,@email,@phone,@primary_contact,@created_at,@updated_at)",
      ).run(row);
      audit(req, "contact.create", "customer", req.params.id, null, row);
      res.status(201).json(row);
    },
  );
  app.post(
    "/api/v1/automations/run",
    authenticate,
    permit("settings.update"),
    (req, res) => {
      const stale = db
          .prepare(
            "SELECT * FROM leads WHERE stage NOT IN ('won','lost','converted') AND datetime(updated_at)<datetime('now','-3 days')",
          )
          .all(),
        created = [];
      for (const lead of stale) {
        const exists = db
          .prepare(
            "SELECT 1 FROM tasks WHERE customer_id IS NULL AND title=? AND status!='done'",
          )
          .get(`Follow up ${lead.full_name}`);
        if (!exists) {
          const ts = now(),
            task = {
              id: id(),
              title: `Follow up ${lead.full_name}`,
              description: `Automated reminder for stale lead ${lead.company || ""}`,
              assigned_to: lead.owner_id || req.user.sub,
              priority: "high",
              status: "todo",
              due_date: new Date(Date.now() + 86400000)
                .toISOString()
                .slice(0, 10),
              progress: 0,
              created_at: ts,
              updated_at: ts,
            };
          db.prepare(
            "INSERT INTO tasks(id,title,description,assigned_to,priority,status,due_date,progress,created_at,updated_at) VALUES(@id,@title,@description,@assigned_to,@priority,@status,@due_date,@progress,@created_at,@updated_at)",
          ).run(task);
          notify(
            task.assigned_to,
            "automation",
            "Lead follow-up created",
            task.title,
            "/crm#tasks",
          );
          created.push(task);
        }
      }
      db.prepare(
        "UPDATE automation_rules SET last_run_at=?,run_count=run_count+1 WHERE active=1",
      ).run(now());
      audit(
        req,
        "automation.run",
        "automation",
        req.body.rule_id || "all",
        null,
        { tasks_created: created.length },
      );
      res.json({ ok: true, tasksCreated: created.length });
    },
  );
  app.post(
    "/api/v1/approvals/:id/decision",
    authenticate,
    permit("settings.update"),
    (req, res) => {
      const row = db
        .prepare(
          "SELECT * FROM approval_requests WHERE id=? AND status='pending'",
        )
        .get(req.params.id);
      if (!row)
        return res
          .status(404)
          .json({ error: { message: "Pending approval not found" } });
      const status = req.body.decision === "approved" ? "approved" : "rejected";
      db.prepare(
        "UPDATE approval_requests SET status=?,decision_notes=?,decided_by=?,decided_at=?,updated_at=? WHERE id=?",
      ).run(status, req.body.notes || "", req.user.sub, now(), now(), row.id);
      notify(
        row.requested_by,
        "approval",
        `Request ${status}`,
        `${row.action} was ${status}`,
        "/crm#approvals",
      );
      audit(req, "approval." + status, "approval", row.id, row, { status });
      res.json({ ...row, status });
    },
  );
  app.post(
    "/api/v1/leave/:id/decision",
    authenticate,
    permit("hr.update"),
    (req, res) => {
      const row = db
        .prepare(
          "SELECT l.*,e.email,e.full_name FROM leave_requests l JOIN employees e ON e.id=l.employee_id WHERE l.id=? AND l.status='pending'",
        )
        .get(req.params.id);
      if (!row)
        return res
          .status(404)
          .json({ error: { message: "Pending leave request not found" } });
      const status = req.body.decision === "approved" ? "approved" : "rejected";
      db.prepare(
        "UPDATE leave_requests SET status=?,approved_by=?,decided_at=?,updated_at=? WHERE id=?",
      ).run(status, req.user.sub, now(), now(), row.id);
      const account = db
        .prepare("SELECT id FROM users WHERE lower(email)=lower(?)")
        .get(row.email);
      notify(
        account?.id || null,
        "leave",
        `Leave request ${status}`,
        `${row.start_date} to ${row.end_date}`,
        "/crm#portal",
      );
      audit(req, "leave." + status, "leave_request", row.id, row, { status });
      res.json({ ...row, status });
    },
  );
  app.get("/api/v1/portal/me", authenticate, (req, res) => {
    const employee = db
      .prepare(
        "SELECT e.*,d.name department FROM employees e LEFT JOIN departments d ON d.id=e.department_id WHERE lower(e.email)=lower(?)",
      )
      .get(req.user.email);
    if (!employee)
      return res
        .status(404)
        .json({
          error: { message: "No employee profile linked to this account" },
        });
    res.json({
      employee,
      tasks: db
        .prepare("SELECT * FROM tasks WHERE assigned_to=? ORDER BY due_date")
        .all(req.user.sub),
      attendance: db
        .prepare(
          "SELECT * FROM attendance WHERE employee_id=? ORDER BY date DESC LIMIT 31",
        )
        .all(employee.id),
      leave: db
        .prepare(
          "SELECT * FROM leave_requests WHERE employee_id=? ORDER BY created_at DESC",
        )
        .all(employee.id),
      payroll: db
        .prepare(
          "SELECT id,month,base_salary,bonuses,deductions,tax,net_salary,status,paid_at FROM payroll WHERE employee_id=? ORDER BY month DESC",
        )
        .all(employee.id),
    });
  });
  app.post("/api/v1/portal/leave", authenticate, (req, res) => {
    const employee = db
      .prepare("SELECT id FROM employees WHERE lower(email)=lower(?)")
      .get(req.user.email);
    if (!employee)
      return res
        .status(404)
        .json({ error: { message: "No linked employee profile" } });
    const ts = now(),
      row = {
        id: id(),
        employee_id: employee.id,
        leave_type: req.body.leave_type || "vacation",
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        days: Number(req.body.days || 1),
        reason: req.body.reason || "",
        status: "pending",
        created_at: ts,
        updated_at: ts,
      };
    db.prepare(
      "INSERT INTO leave_requests(id,employee_id,leave_type,start_date,end_date,days,reason,status,created_at,updated_at) VALUES(@id,@employee_id,@leave_type,@start_date,@end_date,@days,@reason,@status,@created_at,@updated_at)",
    ).run(row);
    notify(
      null,
      "leave",
      "New leave request",
      `${req.user.name} requested ${row.days} day(s)`,
      "/crm#leave_requests",
    );
    res.status(201).json(row);
  });
  app.post("/api/v1/files", authenticate, permit("crm.create"), (req, res) => {
    const match = String(req.body.data || "").match(
      /^data:([\w/+.-]+);base64,(.+)$/,
    );
    if (!match)
      return res
        .status(400)
        .json({ error: { message: "A base64 data URL is required" } });
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 10 * 1024 * 1024)
      return res
        .status(413)
        .json({ error: { message: "File limit is 10 MB" } });
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowed.includes(match[1]))
      return res
        .status(415)
        .json({ error: { message: "File type not allowed" } });
    const stored =
        id() +
        path
          .extname(String(req.body.name || "").replace(/[^\w.-]/g, ""))
          .slice(0, 10),
      dest = path.join(uploadDir, stored);
    fs.writeFileSync(dest, bytes);
    const ts = now(),
      doc = {
        id: id(),
        name: String(req.body.name || "document").slice(0, 200),
        stored_name: stored,
        mime_type: match[1],
        size: bytes.length,
        entity_type: req.body.entity_type || null,
        entity_id: req.body.entity_id || null,
        access_role: req.body.access_role || "employee",
        uploaded_by: req.user.sub,
        created_at: ts,
        updated_at: ts,
      };
    db.transaction(() => {
      db.prepare(
        "INSERT INTO documents VALUES(@id,@name,@stored_name,@mime_type,@size,@entity_type,@entity_id,@access_role,@uploaded_by,@created_at,@updated_at)",
      ).run(doc);
      db.prepare("INSERT INTO file_versions VALUES(?,?,?,?,?,?,?,?)").run(
        id(),
        doc.id,
        1,
        stored,
        bytes.length,
        shaFile(dest),
        req.user.sub,
        ts,
      );
    })();
    audit(req, "file.upload", "document", doc.id, null, doc);
    res.status(201).json(doc);
  });
  app.get("/api/v1/files/:id/download", authenticate, (req, res) => {
    const doc = db
      .prepare("SELECT * FROM documents WHERE id=?")
      .get(req.params.id);
    if (!doc) return res.sendStatus(404);
    const ranks = {
        read_only: 0,
        employee: 1,
        accountant: 2,
        hr: 2,
        manager: 2,
        administrator: 3,
        super_admin: 4,
      },
      needed = ranks[doc.access_role] ?? 1,
      actual = ranks[req.user.role] ?? 0;
    if (actual < needed)
      return res
        .status(403)
        .json({ error: { message: "Your role cannot access this file" } });
    const file = path.join(uploadDir, path.basename(doc.stored_name));
    if (!fs.existsSync(file)) return res.sendStatus(410);
    audit(req, "file.download", "document", doc.id, null, { name: doc.name });
    res.type(doc.mime_type).download(file, doc.name);
  });
  app.get(
    "/api/v1/integrations",
    authenticate,
    permit("settings.read"),
    (req, res) =>
      res.json(
        db
          .prepare(
            "SELECT * FROM provider_integrations ORDER BY category,provider",
          )
          .all()
          .map((x) => ({ ...x, settings: safeJson(x.settings) })),
      ),
  );
  app.post(
    "/api/v1/integrations/:provider/test",
    authenticate,
    permit("settings.update"),
    (req, res) => {
      const row = db
        .prepare("SELECT * FROM provider_integrations WHERE provider=?")
        .get(req.params.provider);
      if (!row) return res.sendStatus(404);
      const status =
        row.mode === "sandbox" || row.status === "connected"
          ? "connected"
          : "not_configured";
      db.prepare(
        "UPDATE provider_integrations SET status=?,last_sync_at=?,last_error=NULL,updated_at=? WHERE id=?",
      ).run(status, now(), now(), row.id);
      audit(req, "integration.test", "integration", row.id, row, { status });
      res.json({
        ok: status === "connected",
        provider: row.provider,
        mode: row.mode,
        status,
      });
    },
  );
  app.post("/api/v1/integrations/:provider/jobs", authenticate, (req, res) => {
    const provider = db
      .prepare("SELECT * FROM provider_integrations WHERE provider=?")
      .get(req.params.provider);
    if (!provider) return res.sendStatus(404);
    const ts = now(),
      job = {
        id: id(),
        provider: provider.provider,
        job_type: req.body.job_type || "send",
        payload: JSON.stringify(req.body.payload || {}),
        status: provider.mode === "sandbox" ? "completed" : "queued",
        attempts: provider.mode === "sandbox" ? 1 : 0,
        scheduled_at: ts,
        completed_at: provider.mode === "sandbox" ? ts : null,
        created_at: ts,
        updated_at: ts,
      };
    db.prepare(
      "INSERT INTO integration_jobs(id,provider,job_type,payload,status,attempts,scheduled_at,completed_at,created_at,updated_at) VALUES(@id,@provider,@job_type,@payload,@status,@attempts,@scheduled_at,@completed_at,@created_at,@updated_at)",
    ).run(job);
    res.status(201).json({ ...job, payload: safeJson(job.payload) });
  });
  app.get(
    "/api/v1/security/overview",
    authenticate,
    permit("settings.read"),
    (req, res) => {
      const scalar = (q) => db.prepare(q).pluck().get() || 0;
      res.json({
        failedLogins24h: scalar(
          "SELECT count(*) FROM login_history WHERE success=0 AND datetime(created_at)>datetime('now','-1 day')",
        ),
        activeSessions: scalar(
          "SELECT count(*) FROM sessions WHERE revoked_at IS NULL AND datetime(expires_at)>datetime('now')",
        ),
        lockedAccounts: scalar(
          "SELECT count(*) FROM users WHERE datetime(locked_until)>datetime('now')",
        ),
        adminActions7d: scalar(
          "SELECT count(*) FROM audit_logs WHERE action LIKE '%delete%' AND datetime(created_at)>datetime('now','-7 days')",
        ),
        passkeys: scalar("SELECT count(*) FROM passkey_credentials"),
        recentLogins: db
          .prepare(
            "SELECT email,ip,device,success,reason,created_at FROM login_history ORDER BY created_at DESC LIMIT 20",
          )
          .all(),
        recentAudit: db
          .prepare(
            "SELECT action,entity_type,entity_id,ip,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 20",
          )
          .all(),
      });
    },
  );
  app.get(
    "/api/v1/monitoring/overview",
    authenticate,
    permit("settings.read"),
    (req, res) => {
      const start = process.uptime();
      res.json({
        status: "healthy",
        uptimeSeconds: Math.round(start),
        memory: process.memoryUsage(),
        database: { wal: true, size: fs.statSync(db.name).size },
        emailConfigured: Boolean(
          process.env.SMTP_HOST && process.env.SMTP_PASS,
        ),
        unresolvedEvents: db
          .prepare(
            "SELECT * FROM monitoring_events WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 20",
          )
          .all(),
        integrations: db
          .prepare(
            "SELECT provider,mode,status,last_sync_at,last_error FROM provider_integrations",
          )
          .all(),
        backups: db
          .prepare(
            "SELECT * FROM backup_runs ORDER BY created_at DESC LIMIT 10",
          )
          .all(),
      });
    },
  );
  app.post(
    "/api/v1/backups",
    authenticate,
    permit("settings.update"),
    async (req, res, next) => {
      try {
        const row = await createBackup(req.user.sub);
        audit(req, "backup.create", "backup", row.id, null, row);
        res.status(201).json(row);
      } catch (e) {
        next(e);
      }
    },
  );
  app.get(
    "/api/v1/backups",
    authenticate,
    permit("settings.read"),
    (req, res) =>
      res.json(
        db
          .prepare(
            "SELECT * FROM backup_runs ORDER BY created_at DESC LIMIT 50",
          )
          .all(),
      ),
  );
  app.get(
    "/api/v1/backups/:id/download",
    authenticate,
    permit("settings.read"),
    (req, res) => {
      const row = db
        .prepare("SELECT * FROM backup_runs WHERE id=? AND status='completed'")
        .get(req.params.id);
      if (!row) return res.sendStatus(404);
      res.download(
        path.join(backupDir, path.basename(row.filename)),
        row.filename,
      );
    },
  );
  app.get(
    "/api/v1/invoices/:id/pdf",
    authenticate,
    permit("invoices.read"),
    (req, res) => {
      const inv = db
        .prepare(
          "SELECT i.*,c.company_name,c.contact_name,c.email,c.address FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id WHERE i.id=?",
        )
        .get(req.params.id);
      if (!inv) return res.sendStatus(404);
      const items = db
          .prepare("SELECT * FROM invoice_items WHERE invoice_id=?")
          .all(inv.id),
        cfg = settings(),
        doc = new PDFDocument({
          size: "A4",
          margin: 48,
          info: { Title: `Invoice ${inv.number}`, Author: cfg.company_name },
        });
      res.type("application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${inv.number}.pdf"`,
      );
      doc.pipe(res);
      doc
        .fillColor("#b86f3c")
        .fontSize(24)
        .text(cfg.company_name || "Greece");
      doc
        .fillColor("#172033")
        .fontSize(10)
        .text(`${cfg.address || ""}\n${cfg.phone || ""} | ${cfg.email || ""}`);
      doc
        .moveDown(2)
        .fontSize(22)
        .text(`INVOICE ${inv.number}`, { align: "right" });
      doc
        .fontSize(10)
        .text(
          `Issue: ${inv.issue_date}\nDue: ${inv.due_date || "-"}\nStatus: ${String(inv.status).toUpperCase()}`,
          { align: "right" },
        );
      doc
        .moveDown()
        .fontSize(12)
        .text(
          `Bill to: ${inv.company_name || "Customer"}\n${inv.contact_name || ""}\n${inv.address || ""}`,
        );
      doc.moveDown(2);
      if (items.length) {
        for (const item of items)
          doc
            .fontSize(10)
            .text(
              `${item.description}   ${item.quantity} x ${Number(item.unit_price).toFixed(2)}   ${Number(item.total).toFixed(2)} ILS`,
            );
      } else
        doc.fontSize(10).text("Professional staffing and maintenance services");
      doc
        .moveDown(2)
        .fontSize(11)
        .text(`Subtotal: ${Number(inv.subtotal).toFixed(2)} ILS`, {
          align: "right",
        })
        .text(
          `VAT (${inv.vat_rate}%): ${Number(inv.vat_amount).toFixed(2)} ILS`,
          { align: "right" },
        )
        .fillColor("#b86f3c")
        .fontSize(15)
        .text(`Total: ${Number(inv.total).toFixed(2)} ILS`, { align: "right" });
      doc
        .moveDown(4)
        .fillColor("#6f7889")
        .fontSize(9)
        .text(
          "Thank you for your business. Payment is due by the date shown above.",
          { align: "center" },
        );
      doc.end();
      audit(req, "invoice.pdf", "invoice", inv.id, null, {
        number: inv.number,
      });
    },
  );
  app.get(
    "/api/v1/reports/business.xlsx",
    authenticate,
    permit("reports.finance"),
    async (req, res) => {
      const wb = new ExcelJS.Workbook();
      wb.creator = "GREECE Business OS";
      const add = (name, rows) => {
        const ws = wb.addWorksheet(name);
        if (!rows.length) {
          ws.addRow(["No data"]);
          return;
        }
        ws.columns = Object.keys(rows[0]).map((k) => ({
          header: k.replaceAll("_", " ").toUpperCase(),
          key: k,
          width: Math.min(34, Math.max(14, k.length + 4)),
        }));
        ws.addRows(rows);
        ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        ws.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFB86F3C" },
        };
        ws.autoFilter = {
          from: "A1",
          to: ws.getRow(1).getCell(ws.columnCount).address,
        };
        ws.views = [{ state: "frozen", ySplit: 1 }];
      };
      add(
        "Customers",
        db
          .prepare(
            "SELECT company_name,contact_name,email,phone,status,address,created_at FROM customers",
          )
          .all(),
      );
      add(
        "Sales Pipeline",
        db
          .prepare(
            "SELECT title,value,stage,probability,expected_close,created_at FROM deals",
          )
          .all(),
      );
      add(
        "Finance",
        db
          .prepare(
            "SELECT type,category,amount,date,description,vat_rate FROM transactions ORDER BY date",
          )
          .all(),
      );
      add(
        "Invoices",
        db
          .prepare(
            "SELECT number,issue_date,due_date,subtotal,vat_amount,total,status FROM invoices",
          )
          .all(),
      );
      add(
        "Employees",
        db
          .prepare(
            "SELECT employee_number,full_name,email,position,salary,status,hire_date FROM employees",
          )
          .all(),
      );
      add(
        "Projects",
        db
          .prepare(
            "SELECT name,status,start_date,deadline,progress,budget,spent FROM projects",
          )
          .all(),
      );
      res.type(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="greece-business-report.xlsx"',
      );
      await wb.xlsx.write(res);
      res.end();
      audit(req, "report.xlsx", "report", "business", null, { sheets: 6 });
    },
  );
  app.get("/api/v1/notifications/stream", authenticate, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    let last = "";
    const send = () => {
      const rows = db
          .prepare(
            "SELECT * FROM notifications WHERE (user_id=? OR user_id IS NULL) AND read_at IS NULL ORDER BY created_at DESC LIMIT 20",
          )
          .all(req.user.sub),
        json = JSON.stringify(rows);
      if (json !== last) {
        res.write(`event: notifications\ndata: ${json}\n\n`);
        last = json;
      }
    };
    send();
    const timer = setInterval(send, 15000);
    req.on("close", () => clearInterval(timer));
  });
  passkeyRoutes(app);
}
function passkeyRoutes(app) {
  const rp = (req) => ({
    rpID: req.hostname,
    rpName: "GREECE Business Platform",
    origin: `${req.protocol}://${req.get("host")}`,
  });
  app.post(
    "/api/v1/auth/passkeys/register/options",
    authenticate,
    async (req, res, next) => {
      try {
        const sw = await import("@simplewebauthn/server"),
          r = rp(req),
          existing = db
            .prepare("SELECT * FROM passkey_credentials WHERE user_id=?")
            .all(req.user.sub),
          options = await sw.generateRegistrationOptions({
            rpName: r.rpName,
            rpID: r.rpID,
            userName: req.user.email,
            userID: new Uint8Array(Buffer.from(req.user.sub)),
            attestationType: "none",
            excludeCredentials: existing.map((x) => ({
              id: x.credential_id,
              transports: safeJson(x.transports, []),
            })),
            authenticatorSelection: {
              residentKey: "preferred",
              userVerification: "required",
            },
            supportedAlgorithmIDs: [-7, -257],
          });
        const cid = id();
        db.prepare("INSERT INTO webauthn_challenges VALUES(?,?,?,?,?,?)").run(
          cid,
          req.user.sub,
          options.challenge,
          "registration",
          new Date(Date.now() + 300000).toISOString(),
          now(),
        );
        res.cookie("webauthn_challenge", cid, {
          httpOnly: true,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          maxAge: 300000,
        });
        res.json(options);
      } catch (e) {
        next(e);
      }
    },
  );
  app.post(
    "/api/v1/auth/passkeys/register/verify",
    authenticate,
    async (req, res, next) => {
      try {
        const sw = await import("@simplewebauthn/server"),
          r = rp(req),
          challenge = db
            .prepare(
              "SELECT * FROM webauthn_challenges WHERE id=? AND user_id=? AND purpose='registration'",
            )
            .get(req.cookies.webauthn_challenge, req.user.sub);
        if (!challenge || new Date(challenge.expires_at) < new Date())
          return res
            .status(400)
            .json({ error: { message: "Registration challenge expired" } });
        db.prepare("DELETE FROM webauthn_challenges WHERE id=?").run(
          challenge.id,
        );
        const result = await sw.verifyRegistrationResponse({
          response: req.body.response,
          expectedChallenge: challenge.challenge,
          expectedOrigin: r.origin,
          expectedRPID: r.rpID,
          requireUserVerification: true,
        });
        if (!result.verified) return res.status(400).json({ verified: false });
        const cred = result.registrationInfo.credential,
          ts = now();
        db.prepare(
          "INSERT INTO passkey_credentials(id,user_id,credential_id,public_key,counter,transports,device_name,created_at) VALUES(?,?,?,?,?,?,?,?)",
        ).run(
          id(),
          req.user.sub,
          cred.id,
          Buffer.from(cred.publicKey).toString("base64"),
          cred.counter || 0,
          JSON.stringify(req.body.response.response?.transports || []),
          req.body.device_name || "Passkey",
          ts,
        );
        audit(req, "passkey.register", "user", req.user.sub, null, {
          device: req.body.device_name || "Passkey",
        });
        res.json({ verified: true });
      } catch (e) {
        next(e);
      }
    },
  );
  app.post("/api/v1/auth/passkeys/options", async (req, res, next) => {
    try {
      const row = db
        .prepare("SELECT id,email FROM users WHERE lower(email)=lower(?)")
        .get(req.body.email || "");
      if (!row)
        return res
          .status(404)
          .json({ error: { message: "Account not found" } });
      const sw = await import("@simplewebauthn/server"),
        r = rp(req),
        credentials = db
          .prepare("SELECT * FROM passkey_credentials WHERE user_id=?")
          .all(row.id);
      if (!credentials.length)
        return res
          .status(404)
          .json({ error: { message: "No passkey registered" } });
      const options = await sw.generateAuthenticationOptions({
          rpID: r.rpID,
          allowCredentials: credentials.map((x) => ({
            id: x.credential_id,
            transports: safeJson(x.transports, []),
          })),
          userVerification: "required",
        }),
        cid = id();
      db.prepare("INSERT INTO webauthn_challenges VALUES(?,?,?,?,?,?)").run(
        cid,
        row.id,
        options.challenge,
        "authentication",
        new Date(Date.now() + 300000).toISOString(),
        now(),
      );
      res.cookie("webauthn_challenge", cid, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 300000,
      });
      res.json(options);
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/v1/auth/passkeys/verify", async (req, res, next) => {
    try {
      const sw = await import("@simplewebauthn/server"),
        r = rp(req),
        challenge = db
          .prepare(
            "SELECT * FROM webauthn_challenges WHERE id=? AND purpose='authentication'",
          )
          .get(req.cookies.webauthn_challenge);
      if (!challenge || new Date(challenge.expires_at) < new Date())
        return res
          .status(400)
          .json({ error: { message: "Authentication challenge expired" } });
      db.prepare("DELETE FROM webauthn_challenges WHERE id=?").run(
        challenge.id,
      );
      const stored = db
        .prepare(
          "SELECT * FROM passkey_credentials WHERE credential_id=? AND user_id=?",
        )
        .get(req.body.response.id, challenge.user_id);
      if (!stored)
        return res
          .status(404)
          .json({ error: { message: "Passkey not recognized" } });
      const result = await sw.verifyAuthenticationResponse({
        response: req.body.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: r.origin,
        expectedRPID: r.rpID,
        credential: {
          id: stored.credential_id,
          publicKey: new Uint8Array(Buffer.from(stored.public_key, "base64")),
          counter: stored.counter,
          transports: safeJson(stored.transports, []),
        },
        requireUserVerification: true,
      });
      if (!result.verified) return res.status(401).json({ verified: false });
      db.prepare(
        "UPDATE passkey_credentials SET counter=?,last_used_at=? WHERE id=?",
      ).run(result.authenticationInfo.newCounter, now(), stored.id);
      const row = db
          .prepare(
            "SELECT u.*,r.name role,r.permissions FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?",
          )
          .get(stored.user_id),
        user = userView(row);
      res.json({ ...issueSession(user, req, res, true), user, verified: true });
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/v1/auth/passkeys", authenticate, (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT id,device_name,created_at,last_used_at FROM passkey_credentials WHERE user_id=?",
        )
        .all(req.user.sub),
    ),
  );
  app.delete("/api/v1/auth/passkeys/:id", authenticate, (req, res) => {
    db.prepare("DELETE FROM passkey_credentials WHERE id=? AND user_id=?").run(
      req.params.id,
      req.user.sub,
    );
    audit(req, "passkey.delete", "user", req.user.sub);
    res.sendStatus(204);
  });
}
module.exports = { businessOSRoutes, createBackup };
