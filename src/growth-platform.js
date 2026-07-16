const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { db, id, now } = require("./db");
const { authenticate, permit, audit } = require("./auth");
const mailer = require("./mailer");
const { backupSecret } = require("./security-config");

const root = path.join(__dirname, "..");
const backupDir = path.join(root, "storage", "backups");
const encryptedDir = path.join(root, "storage", "offsite");
fs.mkdirSync(encryptedDir, { recursive: true });

const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const sha256 = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");
const publicToken = () => crypto.randomBytes(32).toString("base64url");
const sequence = (prefix, table) => {
  const year = new Date().getFullYear();
  const count = db
    .prepare(`SELECT count(*) FROM ${table} WHERE number LIKE ?`)
    .pluck()
    .get(`${prefix}-${year}-%`);
  return `${prefix}-${year}-${String(Number(count) + 1).padStart(4, "0")}`;
};
const customerSummary = (customerId) => {
  const customer = db
    .prepare(
      "SELECT id,company_name,contact_name,email,phone,address,status FROM customers WHERE id=?",
    )
    .get(customerId);
  if (!customer) return null;
  return {
    customer,
    quotes: db
      .prepare(
        "SELECT id,number,title,status,total,valid_until,public_token,created_at FROM quotes WHERE customer_id=? ORDER BY created_at DESC",
      )
      .all(customerId),
    contracts: db
      .prepare(
        "SELECT id,number,title,status,value,start_date,end_date,renewal_date,created_at FROM contracts WHERE customer_id=? ORDER BY created_at DESC",
      )
      .all(customerId),
    invoices: db
      .prepare(
        "SELECT id,number,status,total,issue_date,due_date,paid_at FROM invoices WHERE customer_id=? ORDER BY issue_date DESC",
      )
      .all(customerId),
    requests: db
      .prepare(
        "SELECT id,number,title,priority,status,sla_due_at,resolved_at,created_at,updated_at FROM service_requests WHERE customer_id=? ORDER BY created_at DESC",
      )
      .all(customerId),
    workOrders: db
      .prepare(
        "SELECT id,number,title,priority,status,scheduled_start,scheduled_end,completed_at FROM work_orders WHERE customer_id=? ORDER BY created_at DESC",
      )
      .all(customerId),
  };
};

function createQuote(req, res) {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
  const title = text(req.body.title, 180);
  if (!title || !req.body.customer_id || !items.length)
    return res.status(400).json({
      error: { message: "Customer, title and at least one item are required" },
    });
  if (!db.prepare("SELECT 1 FROM customers WHERE id=?").get(req.body.customer_id))
    return res.status(400).json({ error: { message: "Customer not found" } });
  const normalized = items.map((item, index) => {
    const quantity = Math.max(0, number(item.quantity, 1));
    const unitPrice = Math.max(0, number(item.unit_price));
    return {
      id: id(),
      description: text(item.description, 500),
      quantity,
      unit_price: unitPrice,
      total: Math.round(quantity * unitPrice * 100) / 100,
      sort_order: index,
    };
  });
  if (normalized.some((item) => !item.description))
    return res
      .status(400)
      .json({ error: { message: "Every quote item needs a description" } });
  const subtotal = normalized.reduce((sum, item) => sum + item.total, 0);
  const vatRate = Math.min(100, Math.max(0, number(req.body.vat_rate, 17)));
  const vatAmount = Math.round(subtotal * vatRate) / 100;
  const ts = now();
  const quote = {
    id: id(),
    number: sequence("Q", "quotes"),
    customer_id: req.body.customer_id,
    lead_id: req.body.lead_id || null,
    title,
    status: "draft",
    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total: subtotal + vatAmount,
    valid_until:
      req.body.valid_until ||
      new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    notes: text(req.body.notes, 4000),
    public_token: publicToken(),
    created_by: req.user.sub,
    created_at: ts,
    updated_at: ts,
  };
  db.transaction(() => {
    db.prepare(
      "INSERT INTO quotes(id,number,customer_id,lead_id,title,status,subtotal,vat_rate,vat_amount,total,valid_until,notes,public_token,created_by,created_at,updated_at) VALUES(@id,@number,@customer_id,@lead_id,@title,@status,@subtotal,@vat_rate,@vat_amount,@total,@valid_until,@notes,@public_token,@created_by,@created_at,@updated_at)",
    ).run(quote);
    const insert = db.prepare(
      "INSERT INTO quote_items(id,quote_id,description,quantity,unit_price,total,sort_order) VALUES(@id,@quote_id,@description,@quantity,@unit_price,@total,@sort_order)",
    );
    normalized.forEach((item) => insert.run({ ...item, quote_id: quote.id }));
  })();
  audit(req, "quote.create", "quote", quote.id, null, quote);
  res.status(201).json({ ...quote, items: normalized });
}

function quoteDetails(token) {
  const quote = db
    .prepare(
      "SELECT q.*,c.company_name,c.contact_name,c.email,c.phone,c.address FROM quotes q LEFT JOIN customers c ON c.id=q.customer_id WHERE q.public_token=?",
    )
    .get(token);
  if (!quote) return null;
  return {
    quote,
    items: db
      .prepare("SELECT * FROM quote_items WHERE quote_id=? ORDER BY sort_order")
      .all(quote.id),
  };
}

function encryptionKey() {
  return crypto.createHash("sha256").update(backupSecret).digest();
}

function encryptBackup(source, destination) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(fs.readFileSync(source)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  fs.writeFileSync(
    destination,
    Buffer.concat([Buffer.from("GRISBACKUP1"), iv, tag, encrypted]),
    { mode: 0o600 },
  );
}

function restoreTest(backup) {
  const testId = id();
  const ts = now();
  db.prepare(
    "INSERT INTO restore_tests(id,backup_id,status,created_at) VALUES(?,?,?,?)",
  ).run(testId, backup.id, "running", ts);
  const source = path.join(backupDir, path.basename(backup.filename));
  let testDb;
  try {
    testDb = new Database(source, { readonly: true, fileMustExist: true });
    const integrity = testDb.pragma("integrity_check", { simple: true });
    const tableNames = [
      "customers",
      "leads",
      "projects",
      "invoices",
      "work_orders",
      "audit_logs",
    ];
    const counts = Object.fromEntries(
      tableNames.map((table) => [
        table,
        testDb.prepare(`SELECT count(*) FROM ${table}`).pluck().get(),
      ]),
    );
    testDb.close();
    db.prepare(
      "UPDATE restore_tests SET status='passed',integrity_result=?,row_counts=?,completed_at=? WHERE id=?",
    ).run(String(integrity), JSON.stringify(counts), now(), testId);
  } catch (error) {
    if (testDb) testDb.close();
    db.prepare(
      "UPDATE restore_tests SET status='failed',error=?,completed_at=? WHERE id=?",
    ).run(text(error.message, 1000), now(), testId);
  }
  return db.prepare("SELECT * FROM restore_tests WHERE id=?").get(testId);
}

function growthPlatformRoutes(app, publicFormLimiter = (req, res, next) => next()) {
  app.post(
    "/api/v1/quotes/build",
    authenticate,
    permit("crm.create"),
    createQuote,
  );
  app.get(
    "/api/v1/quotes/:id/detail",
    authenticate,
    permit("crm.read"),
    (req, res) => {
      const quote = db.prepare("SELECT * FROM quotes WHERE id=?").get(req.params.id);
      if (!quote) return res.sendStatus(404);
      res.json({
        quote,
        items: db
          .prepare("SELECT * FROM quote_items WHERE quote_id=? ORDER BY sort_order")
          .all(quote.id),
      });
    },
  );
  app.post(
    "/api/v1/quotes/:id/send",
    authenticate,
    permit("crm.update"),
    async (req, res, next) => {
      try {
        const row = db
          .prepare(
            "SELECT q.*,c.email,c.contact_name,c.company_name FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.id=?",
          )
          .get(req.params.id);
        if (!row) return res.sendStatus(404);
        if (!row.email)
          return res
            .status(400)
            .json({ error: { message: "Customer email is missing" } });
        const link = `${req.protocol}://${req.get("host")}/quote/${row.public_token}`;
        const sent = await mailer.sendTo({
          to: row.email,
          subject: `GRIS quotation ${row.number}`,
          body: `Hello ${row.contact_name || row.company_name},\n\nYour quotation is ready to review and accept:\n${link}\n\nGRIS`,
        });
        if (!sent.sent)
          return res.status(503).json({ error: { message: sent.reason } });
        db.prepare(
          "UPDATE quotes SET status='sent',updated_at=? WHERE id=?",
        ).run(now(), row.id);
        audit(req, "quote.send", "quote", row.id, row, { status: "sent" });
        res.json({ ok: true, messageId: sent.messageId, link });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/contracts/build",
    authenticate,
    permit("crm.create"),
    (req, res) => {
      const quote = db
        .prepare("SELECT * FROM quotes WHERE id=?")
        .get(req.body.quote_id);
      if (!quote) return res.sendStatus(404);
      if (db.prepare("SELECT 1 FROM contracts WHERE quote_id=?").get(quote.id))
        return res
          .status(409)
          .json({ error: { message: "A contract already exists for this quote" } });
      const ts = now();
      const startDate = req.body.start_date || ts.slice(0, 10);
      const endDate =
        req.body.end_date ||
        new Date(new Date(startDate).getTime() + 365 * 86400000)
          .toISOString()
          .slice(0, 10);
      const row = {
        id: id(),
        number: sequence("C", "contracts"),
        customer_id: quote.customer_id,
        quote_id: quote.id,
        title: text(req.body.title || quote.title, 180),
        status: "draft",
        start_date: startDate,
        end_date: endDate,
        renewal_date: new Date(new Date(endDate).getTime() - 30 * 86400000)
          .toISOString()
          .slice(0, 10),
        value: quote.total,
        terms: text(
          req.body.terms ||
            "Services will be delivered according to the accepted quotation, agreed service levels, safety requirements and applicable law.",
          10000,
        ),
        public_token: publicToken(),
        created_by: req.user.sub,
        created_at: ts,
        updated_at: ts,
      };
      db.prepare(
        "INSERT INTO contracts(id,number,customer_id,quote_id,title,status,start_date,end_date,renewal_date,value,terms,public_token,created_by,created_at,updated_at) VALUES(@id,@number,@customer_id,@quote_id,@title,@status,@start_date,@end_date,@renewal_date,@value,@terms,@public_token,@created_by,@created_at,@updated_at)",
      ).run(row);
      audit(req, "contract.create", "contract", row.id, null, row);
      res.status(201).json(row);
    },
  );

  app.get("/api/v1/public/quotes/:token", (req, res) => {
    const result = quoteDetails(req.params.token);
    if (!result) return res.sendStatus(404);
    if (!result.quote.viewed_at) {
      const viewedAt = now();
      db.prepare(
        "UPDATE quotes SET viewed_at=?,status=CASE WHEN status='sent' THEN 'viewed' ELSE status END,updated_at=? WHERE id=?",
      ).run(viewedAt, viewedAt, result.quote.id);
      result.quote.viewed_at = viewedAt;
      if (result.quote.status === "sent") result.quote.status = "viewed";
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(result);
  });
  app.post("/api/v1/public/quotes/:token/accept", publicFormLimiter, (req, res) => {
    const result = quoteDetails(req.params.token);
    if (!result) return res.sendStatus(404);
    if (["accepted", "rejected", "expired"].includes(result.quote.status))
      return res
        .status(409)
        .json({ error: { message: "This quotation is already closed" } });
    const signedName = text(req.body.signed_name, 150);
    if (signedName.length < 2 || req.body.accept_terms !== true)
      return res.status(400).json({
        error: { message: "Name and acceptance confirmation are required" },
      });
    db.prepare(
      "UPDATE quotes SET status='accepted',signed_name=?,signed_ip=?,accepted_at=?,updated_at=? WHERE id=?",
    ).run(signedName, req.ip, now(), now(), result.quote.id);
    res.json({ ok: true, status: "accepted" });
  });

  app.get("/api/v1/public/contracts/:token", (req, res) => {
    const contract = db
      .prepare(
        "SELECT c.*,cu.company_name,cu.contact_name FROM contracts c JOIN customers cu ON cu.id=c.customer_id WHERE c.public_token=?",
      )
      .get(req.params.token);
    if (!contract) return res.sendStatus(404);
    res.setHeader("Cache-Control", "no-store");
    res.json(contract);
  });
  app.post("/api/v1/public/contracts/:token/sign", publicFormLimiter, (req, res) => {
    const contract = db
      .prepare("SELECT * FROM contracts WHERE public_token=?")
      .get(req.params.token);
    if (!contract) return res.sendStatus(404);
    if (contract.signed_at)
      return res
        .status(409)
        .json({ error: { message: "Contract has already been signed" } });
    const signedName = text(req.body.signed_name, 150);
    if (signedName.length < 2 || req.body.accept_terms !== true)
      return res.status(400).json({
        error: { message: "Name and acceptance confirmation are required" },
      });
    db.prepare(
      "UPDATE contracts SET signed_name=?,signed_at=?,status='active',updated_at=? WHERE id=?",
    ).run(signedName, now(), now(), contract.id);
    res.json({ ok: true, status: "active" });
  });

  app.post(
    "/api/v1/customer-portal/access",
    authenticate,
    permit("crm.update"),
    (req, res) => {
      const customerId = req.body.customer_id;
      if (!db.prepare("SELECT 1 FROM customers WHERE id=?").get(customerId))
        return res.sendStatus(404);
      const raw = publicToken();
      const row = {
        id: id(),
        customer_id: customerId,
        token_hash: sha256(raw),
        label: text(req.body.label || "Customer portal", 120),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_by: req.user.sub,
        created_at: now(),
      };
      db.prepare(
        "INSERT INTO customer_portal_tokens(id,customer_id,token_hash,label,expires_at,created_by,created_at) VALUES(@id,@customer_id,@token_hash,@label,@expires_at,@created_by,@created_at)",
      ).run(row);
      audit(req, "portal.access.create", "customer", customerId, null, {
        expires_at: row.expires_at,
      });
      res.status(201).json({
        url: `${req.protocol}://${req.get("host")}/portal/${raw}`,
        expires_at: row.expires_at,
      });
    },
  );
  const portalCustomer = (raw) =>
    db
      .prepare(
        "SELECT c.*,p.id portal_token_id FROM customer_portal_tokens p JOIN customers c ON c.id=p.customer_id WHERE p.token_hash=? AND p.revoked_at IS NULL AND datetime(p.expires_at)>datetime('now')",
      )
      .get(sha256(raw));
  app.get("/api/v1/public/portal/:token", (req, res) => {
    const customer = portalCustomer(req.params.token);
    if (!customer) return res.sendStatus(404);
    db.prepare(
      "UPDATE customer_portal_tokens SET last_used_at=? WHERE id=?",
    ).run(now(), customer.portal_token_id);
    res.setHeader("Cache-Control", "no-store");
    res.json(customerSummary(customer.id));
  });
  app.post("/api/v1/public/portal/:token/requests", publicFormLimiter, (req, res) => {
    const customer = portalCustomer(req.params.token);
    if (!customer) return res.sendStatus(404);
    const title = text(req.body.title, 180);
    if (!title)
      return res.status(400).json({ error: { message: "Title is required" } });
    const ts = now();
    const row = {
      id: id(),
      number: sequence("SR", "service_requests"),
      customer_id: customer.id,
      contact_name: text(req.body.contact_name || customer.contact_name, 150),
      contact_email: text(req.body.contact_email || customer.email, 180),
      title,
      description: text(req.body.description, 4000),
      category: text(req.body.category || "general", 80),
      priority: ["low", "medium", "high", "urgent"].includes(req.body.priority)
        ? req.body.priority
        : "medium",
      status: "open",
      source: "portal",
      sla_due_at: new Date(Date.now() + 4 * 3600000).toISOString(),
      created_at: ts,
      updated_at: ts,
    };
    db.prepare(
      "INSERT INTO service_requests(id,number,customer_id,contact_name,contact_email,title,description,category,priority,status,source,sla_due_at,created_at,updated_at) VALUES(@id,@number,@customer_id,@contact_name,@contact_email,@title,@description,@category,@priority,@status,@source,@sla_due_at,@created_at,@updated_at)",
    ).run(row);
    res.status(201).json(row);
  });

  app.post(
    "/api/v1/work-orders/:id/check-in",
    authenticate,
    permit("projects.update"),
    (req, res) => {
      const workOrder = db
        .prepare("SELECT * FROM work_orders WHERE id=?")
        .get(req.params.id);
      if (!workOrder) return res.sendStatus(404);
      if (workOrder.check_in_at)
        return res.status(409).json({ error: { message: "Already checked in" } });
      const lat = number(req.body.latitude, null);
      const lng = number(req.body.longitude, null);
      db.prepare(
        "UPDATE work_orders SET check_in_at=?,check_in_lat=?,check_in_lng=?,status='in_progress',updated_at=? WHERE id=?",
      ).run(now(), lat, lng, now(), workOrder.id);
      audit(req, "work_order.check_in", "work_order", workOrder.id);
      res.json(db.prepare("SELECT * FROM work_orders WHERE id=?").get(workOrder.id));
    },
  );
  app.post(
    "/api/v1/work-orders/:id/check-out",
    authenticate,
    permit("projects.update"),
    (req, res) => {
      const workOrder = db
        .prepare("SELECT * FROM work_orders WHERE id=?")
        .get(req.params.id);
      if (!workOrder) return res.sendStatus(404);
      if (!workOrder.check_in_at)
        return res
          .status(409)
          .json({ error: { message: "Check in before completing work" } });
      const resolution = text(req.body.resolution, 4000);
      if (!resolution)
        return res
          .status(400)
          .json({ error: { message: "Resolution notes are required" } });
      db.prepare(
        "UPDATE work_orders SET check_out_at=?,check_out_lat=?,check_out_lng=?,resolution=?,customer_signature=?,status='completed',completed_at=?,updated_at=? WHERE id=?",
      ).run(
        now(),
        number(req.body.latitude, null),
        number(req.body.longitude, null),
        resolution,
        text(req.body.customer_signature, 180),
        now(),
        now(),
        workOrder.id,
      );
      audit(req, "work_order.check_out", "work_order", workOrder.id);
      res.json(db.prepare("SELECT * FROM work_orders WHERE id=?").get(workOrder.id));
    },
  );
  app.post(
    "/api/v1/inventory/:id/adjust",
    authenticate,
    permit("projects.update"),
    (req, res) => {
      const item = db
        .prepare("SELECT * FROM inventory_items WHERE id=?")
        .get(req.params.id);
      if (!item) return res.sendStatus(404);
      const delta = number(req.body.quantity);
      if (!delta)
        return res
          .status(400)
          .json({ error: { message: "A non-zero quantity is required" } });
      const balance = item.quantity + delta;
      if (balance < 0)
        return res
          .status(409)
          .json({ error: { message: "Insufficient inventory" } });
      const ts = now();
      db.transaction(() => {
        db.prepare(
          "UPDATE inventory_items SET quantity=?,updated_at=? WHERE id=?",
        ).run(balance, ts, item.id);
        db.prepare(
          "INSERT INTO inventory_movements(id,item_id,work_order_id,movement_type,quantity,balance_after,reason,user_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        ).run(
          id(),
          item.id,
          req.body.work_order_id || null,
          delta > 0 ? "in" : "out",
          Math.abs(delta),
          balance,
          text(req.body.reason, 500),
          req.user.sub,
          ts,
          ts,
        );
      })();
      audit(req, "inventory.adjust", "inventory_item", item.id, item, {
        quantity: balance,
      });
      res.json(db.prepare("SELECT * FROM inventory_items WHERE id=?").get(item.id));
    },
  );

  app.get(
    "/api/v1/operations/schedule",
    authenticate,
    permit("projects.read"),
    (req, res) => {
      const from = req.query.from || new Date().toISOString().slice(0, 10);
      const to =
        req.query.to ||
        new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const shifts = db
        .prepare(
          "SELECT s.*,e.full_name employee,c.company_name customer FROM shifts s JOIN employees e ON e.id=s.employee_id LEFT JOIN customers c ON c.id=s.customer_id WHERE date(s.start_at) BETWEEN date(?) AND date(?) ORDER BY s.start_at",
        )
        .all(from, to);
      const workOrders = db
        .prepare(
          "SELECT w.*,e.full_name employee,c.company_name customer FROM work_orders w LEFT JOIN employees e ON e.id=w.assigned_employee_id LEFT JOIN customers c ON c.id=w.customer_id WHERE date(w.scheduled_start) BETWEEN date(?) AND date(?) ORDER BY w.scheduled_start",
        )
        .all(from, to);
      const conflicts = db
        .prepare(
          "SELECT a.id first_id,b.id second_id,e.full_name employee FROM shifts a JOIN shifts b ON a.employee_id=b.employee_id AND a.id<b.id AND datetime(a.start_at)<datetime(b.end_at) AND datetime(b.start_at)<datetime(a.end_at) JOIN employees e ON e.id=a.employee_id WHERE date(a.start_at) BETWEEN date(?) AND date(?)",
        )
        .all(from, to);
      res.json({ from, to, shifts, workOrders, conflicts });
    },
  );

  app.post(
    "/api/v1/workflows/:id/run",
    authenticate,
    permit("settings.update"),
    (req, res) => {
      const rule = db
        .prepare("SELECT * FROM automation_rules WHERE id=? AND active=1")
        .get(req.params.id);
      if (!rule) return res.sendStatus(404);
      const started = now();
      const run = {
        id: id(),
        rule_id: rule.id,
        entity_type: text(req.body.entity_type || rule.entity_type, 80),
        entity_id: req.body.entity_id || null,
        status: "completed",
        actions_completed: 0,
        output: "{}",
        started_at: started,
        completed_at: started,
      };
      let actions = [];
      try {
        actions = JSON.parse(rule.actions || "[]");
      } catch {}
      run.actions_completed = actions.length;
      run.output = JSON.stringify({
        evaluated: true,
        actions: actions.map((action) => action.type || "unknown"),
      });
      db.prepare(
        "INSERT INTO workflow_runs(id,rule_id,entity_type,entity_id,status,actions_completed,output,started_at,completed_at) VALUES(@id,@rule_id,@entity_type,@entity_id,@status,@actions_completed,@output,@started_at,@completed_at)",
      ).run(run);
      db.prepare(
        "UPDATE automation_rules SET last_run_at=?,run_count=run_count+1,updated_at=? WHERE id=?",
      ).run(started, started, rule.id);
      audit(req, "workflow.run", "automation_rule", rule.id, rule, run);
      res.status(201).json(run);
    },
  );

  app.get(
    "/api/v1/analytics/operations",
    authenticate,
    permit("dashboard.read"),
    (req, res) => {
      const scalar = (query, ...params) =>
        db.prepare(query).pluck().get(...params) || 0;
      res.json({
        sales: {
          pipelineValue: scalar(
            "SELECT sum(value) FROM deals WHERE stage NOT IN ('won','lost')",
          ),
          quoteValue: scalar(
            "SELECT sum(total) FROM quotes WHERE status IN ('sent','viewed','accepted')",
          ),
          conversionRate: scalar(
            "SELECT round(100.0*sum(stage IN ('won','converted'))/max(count(*),1),1) FROM leads",
          ),
        },
        service: {
          openRequests: scalar(
            "SELECT count(*) FROM service_requests WHERE status NOT IN ('resolved','closed')",
          ),
          slaAtRisk: scalar(
            "SELECT count(*) FROM service_requests WHERE status NOT IN ('resolved','closed') AND datetime(sla_due_at)<datetime('now','+2 hours')",
          ),
          completionRate: scalar(
            "SELECT round(100.0*sum(status='completed')/max(count(*),1),1) FROM work_orders",
          ),
        },
        workforce: {
          upcomingShifts: scalar(
            "SELECT count(*) FROM shifts WHERE datetime(start_at) BETWEEN datetime('now') AND datetime('now','+7 days')",
          ),
          scheduledHours: scalar(
            "SELECT round(sum((julianday(end_at)-julianday(start_at))*24),1) FROM shifts WHERE date(start_at)>=date('now')",
          ),
          activeEmployees: scalar(
            "SELECT count(*) FROM employees WHERE status='active'",
          ),
        },
        inventory: {
          lowStock: scalar(
            "SELECT count(*) FROM inventory_items WHERE status='active' AND quantity<=reorder_level",
          ),
          stockValue: scalar(
            "SELECT round(sum(quantity*unit_cost),2) FROM inventory_items WHERE status='active'",
          ),
        },
        experience: db
          .prepare(
            "SELECT metric,round(avg(value),2) average,count(*) samples FROM web_vitals WHERE datetime(created_at)>datetime('now','-30 days') GROUP BY metric",
          )
          .all(),
        trends: db
          .prepare(
            "SELECT substr(created_at,1,10) day,count(*) requests FROM service_requests WHERE datetime(created_at)>datetime('now','-30 days') GROUP BY day ORDER BY day",
          )
          .all(),
      });
    },
  );

  app.post("/api/v1/public/web-vitals", (req, res) => {
    const allowed = ["CLS", "FCP", "INP", "LCP", "TTFB"];
    if (!allowed.includes(req.body.metric) || !Number.isFinite(Number(req.body.value)))
      return res.sendStatus(400);
    db.prepare(
      "INSERT INTO web_vitals(id,metric,value,rating,route,session_id,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?)",
    ).run(
      id(),
      req.body.metric,
      Number(req.body.value),
      text(req.body.rating, 30),
      text(req.body.route, 200),
      text(req.body.session_id, 100),
      text(req.headers["user-agent"], 500),
      now(),
    );
    res.sendStatus(204);
  });

  app.get("/api/v1/preferences", authenticate, (req, res) => {
    const row = db
      .prepare("SELECT * FROM user_preferences WHERE user_id=?")
      .get(req.user.sub);
    res.json(
      row || {
        user_id: req.user.sub,
        dashboard_layout: "[]",
        locale: "en",
        theme: "dark",
        compact_mode: 0,
      },
    );
  });
  app.put("/api/v1/preferences", authenticate, (req, res) => {
    const layout = Array.isArray(req.body.dashboard_layout)
      ? JSON.stringify(req.body.dashboard_layout.slice(0, 20))
      : "[]";
    const locale = ["en", "he", "ru"].includes(req.body.locale)
      ? req.body.locale
      : "en";
    const theme = ["dark", "light"].includes(req.body.theme)
      ? req.body.theme
      : "dark";
    db.prepare(
      "INSERT INTO user_preferences(user_id,dashboard_layout,locale,theme,compact_mode,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET dashboard_layout=excluded.dashboard_layout,locale=excluded.locale,theme=excluded.theme,compact_mode=excluded.compact_mode,updated_at=excluded.updated_at",
    ).run(
      req.user.sub,
      layout,
      locale,
      theme,
      req.body.compact_mode ? 1 : 0,
      now(),
    );
    res.json(db.prepare("SELECT * FROM user_preferences WHERE user_id=?").get(req.user.sub));
  });

  app.post("/api/v1/assistant", authenticate, (req, res) => {
    const prompt = text(req.body.prompt, 1000);
    if (prompt.length < 2)
      return res.status(400).json({ error: { message: "Ask a question" } });
    const lower = prompt.toLowerCase();
    const metrics = {
      openLeads: db
        .prepare("SELECT count(*) FROM leads WHERE stage NOT IN ('won','lost')")
        .pluck()
        .get(),
      openTasks: db
        .prepare("SELECT count(*) FROM tasks WHERE status!='done'")
        .pluck()
        .get(),
      outstanding: db
        .prepare(
          "SELECT coalesce(sum(total),0) FROM invoices WHERE status NOT IN ('paid','cancelled')",
        )
        .pluck()
        .get(),
      openRequests: db
        .prepare(
          "SELECT count(*) FROM service_requests WHERE status NOT IN ('resolved','closed')",
        )
        .pluck()
        .get(),
      lowStock: db
        .prepare(
          "SELECT count(*) FROM inventory_items WHERE quantity<=reorder_level AND status='active'",
        )
        .pluck()
        .get(),
    };
    let response = `Current business snapshot: ${metrics.openLeads} open leads, ${metrics.openTasks} open tasks, ₪${Number(metrics.outstanding).toLocaleString()} outstanding invoices, ${metrics.openRequests} service requests, and ${metrics.lowStock} low-stock items.`;
    let sources = ["leads", "tasks", "invoices", "service_requests", "inventory_items"];
    if (lower.includes("lead") || lower.includes("sales")) {
      const leads = db
        .prepare(
          "SELECT full_name,company,score,stage,follow_up_at FROM leads WHERE stage NOT IN ('won','lost') ORDER BY score DESC LIMIT 5",
        )
        .all();
      response = leads.length
        ? `Top sales follow-ups: ${leads.map((lead) => `${lead.full_name} (${lead.company || "no company"}, score ${lead.score}, ${lead.stage})`).join("; ")}.`
        : "There are no open sales leads.";
      sources = ["leads"];
    } else if (lower.includes("service") || lower.includes("ticket")) {
      const requests = db
        .prepare(
          "SELECT number,title,priority,status,sla_due_at FROM service_requests WHERE status NOT IN ('resolved','closed') ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,sla_due_at LIMIT 5",
        )
        .all();
      response = requests.length
        ? `Service priorities: ${requests.map((item) => `${item.number} ${item.title} (${item.priority}, ${item.status})`).join("; ")}.`
        : "There are no open service requests.";
      sources = ["service_requests"];
    } else if (lower.includes("inventory") || lower.includes("stock")) {
      const items = db
        .prepare(
          "SELECT name,sku,quantity,reorder_level,unit FROM inventory_items WHERE quantity<=reorder_level ORDER BY quantity-reorder_level LIMIT 8",
        )
        .all();
      response = items.length
        ? `Reorder recommended: ${items.map((item) => `${item.name} (${item.quantity} ${item.unit}, threshold ${item.reorder_level})`).join("; ")}.`
        : "All active inventory items are above their reorder levels.";
      sources = ["inventory_items"];
    }
    const run = {
      id: id(),
      user_id: req.user.sub,
      prompt,
      response,
      sources: JSON.stringify(sources),
      mode: "local",
      created_at: now(),
    };
    db.prepare(
      "INSERT INTO ai_assistant_runs(id,user_id,prompt,response,sources,mode,created_at) VALUES(@id,@user_id,@prompt,@response,@sources,@mode,@created_at)",
    ).run(run);
    res.json({ response, sources, mode: "local", runId: run.id });
  });

  app.post(
    "/api/v1/backups/:id/encrypt",
    authenticate,
    permit("settings.update"),
    (req, res, next) => {
      try {
        const backup = db
          .prepare("SELECT * FROM backup_runs WHERE id=? AND status='completed'")
          .get(req.params.id);
        if (!backup) return res.sendStatus(404);
        const source = path.join(backupDir, path.basename(backup.filename));
        const filename = `${backup.filename}.aes`;
        const destination = path.join(encryptedDir, filename);
        encryptBackup(source, destination);
        audit(req, "backup.encrypt", "backup", backup.id, null, {
          filename,
          algorithm: "AES-256-GCM",
        });
        res.json({
          ok: true,
          filename,
          size: fs.statSync(destination).size,
          algorithm: "AES-256-GCM",
        });
      } catch (error) {
        next(error);
      }
    },
  );
  app.post(
    "/api/v1/backups/:id/restore-test",
    authenticate,
    permit("settings.update"),
    (req, res) => {
      const backup = db
        .prepare("SELECT * FROM backup_runs WHERE id=? AND status='completed'")
        .get(req.params.id);
      if (!backup) return res.sendStatus(404);
      const result = restoreTest(backup);
      audit(req, "backup.restore_test", "backup", backup.id, null, result);
      res.status(result.status === "passed" ? 200 : 500).json(result);
    },
  );
  app.get(
    "/api/v1/restore-tests",
    authenticate,
    permit("settings.read"),
    (req, res) =>
      res.json(
        db.prepare("SELECT * FROM restore_tests ORDER BY created_at DESC LIMIT 50").all(),
      ),
  );
}

module.exports = { growthPlatformRoutes, encryptBackup, restoreTest };
