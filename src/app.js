const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");
const crypto = require("crypto");
const { db, id, now } = require("./db");
const { authRoutes } = require("./auth");
const { apiRoutes } = require("./api");
const mailer = require("./mailer");
const { businessOSRoutes } = require("./business-os");
const { growthPlatformRoutes } = require("./growth-platform");
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use((req, res, next) => {
  const crm = req.path === "/crm" || req.path.startsWith("/crm/");
  const directives = [
    "default-src 'self'",
    `script-src 'self'${crm ? " 'unsafe-inline'" : ""}`,
    `script-src-attr ${crm ? "'unsafe-inline'" : "'none'"}`,
    `style-src 'self' https://fonts.googleapis.com${crm ? " 'unsafe-inline'" : ""}`,
    `style-src-attr ${crm ? "'unsafe-inline'" : "'none'"}`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://media.base44.com https://images.unsplash.com",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ];
  res.setHeader("Content-Security-Policy", directives.join("; "));
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  );
  next();
});
app.use(compression());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: false, limit: "15mb" }));
app.use(cookieParser());
const limiter = rateLimit({
  windowMs: 60000,
  limit: 240,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 12,
  skipSuccessfulRequests: true,
});
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { message: "Too many requests. Please try again later." } },
});
app.use("/api", limiter);
app.use((req, res, next) => {
  const requestId = crypto.randomUUID(), startedAt = process.hrtime.bigint();
  res.setHeader("X-Request-Id", requestId);
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (durationMs > 2000 || res.statusCode >= 500) {
      try {
        db.prepare(
          "INSERT INTO monitoring_events(id,level,source,event_type,message,metadata,created_at) VALUES(?,?,?,?,?,?,?)",
        ).run(
          id(),
          res.statusCode >= 500 ? "error" : "warning",
          "http",
          res.statusCode >= 500 ? "request_failed" : "slow_request",
          `${req.method} ${req.path} completed with ${res.statusCode}`,
          JSON.stringify({ request_id: requestId, duration_ms: Math.round(durationMs) }),
          now(),
        );
      } catch {}
    }
  });
  next();
});
authRoutes(app, loginLimiter);
apiRoutes(app);
businessOSRoutes(app);
growthPlatformRoutes(app, publicFormLimiter);
app.get("/api/health", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({
      status: "healthy",
      version: "2.1.0",
      time: now(),
      uptime: Math.round(process.uptime()),
    });
  } catch (error) {
    res.status(503).json({ status: "unhealthy" });
  }
});
app.post("/api/v1/public/leads", publicFormLimiter, async (req, res) => {
  if (req.body.website) return res.status(201).json({ ok: true });
  const fullName = String(req.body.full_name || "").trim();
  const phone = String(req.body.phone || "").trim();
  const emailAddress = String(req.body.email || "").trim();
  if (fullName.length < 2 || !/^[+\d][\d\s().-]{6,38}$/.test(phone))
    return res
      .status(400)
      .json({ error: { message: "A valid name and phone are required" } });
  if (emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress))
    return res.status(400).json({ error: { message: "Email is invalid" } });
  const ts = now(),
    x = {
      id: id(),
      full_name: fullName.slice(0, 120),
      company: String(req.body.company || "").trim().slice(0, 160),
      email: emailAddress.slice(0, 180),
      phone: phone.slice(0, 40),
      source: "website",
      score: 20,
      stage: "new",
      service_type: String(req.body.service_type || ""),
      message: String(req.body.message || "").slice(0, 2000),
      created_at: ts,
      updated_at: ts,
    };
  db.prepare(
    "INSERT INTO leads(id,full_name,company,email,phone,source,score,stage,service_type,message,created_at,updated_at) VALUES(@id,@full_name,@company,@email,@phone,@source,@score,@stage,@service_type,@message,@created_at,@updated_at)",
  ).run(x);
  let email = { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  try {
    email = await mailer.sendLead(x);
  } catch (error) {
    console.error("Contact email failed:", error.message);
    email = { sent: false, reason: "SMTP_ERROR" };
  }
  res.status(201).json({ id: x.id, ok: true, emailSent: email.sent });
});
app.post("/api/v1/public/applications", publicFormLimiter, async (req, res) => {
  if (req.body.website) return res.status(201).json({ ok: true });
  const fullName = String(req.body.full_name || "").trim();
  const phone = String(req.body.phone || "").trim();
  const emailAddress = String(req.body.email || "").trim();
  if (fullName.length < 2 || !/^[+\d][\d\s().-]{6,38}$/.test(phone))
    return res
      .status(400)
      .json({ error: { message: "A valid name and phone are required" } });
  if (emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress))
    return res.status(400).json({ error: { message: "Email is invalid" } });
  const ts = now(),
    x = {
      id: id(),
      job_id: req.body.job_id || null,
      job_title: req.body.job_title || "",
      full_name: fullName.slice(0, 120),
      email: emailAddress.slice(0, 180),
      phone: phone.slice(0, 40),
      experience: String(req.body.experience || "").slice(0, 2500),
      status: "pending",
      created_at: ts,
      updated_at: ts,
    };
  db.prepare(
    "INSERT INTO job_applications VALUES(@id,@job_id,@job_title,@full_name,@email,@phone,@experience,@status,@created_at,@updated_at)",
  ).run(x);
  let email = { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  try {
    email = await mailer.sendApplication(x);
  } catch (error) {
    console.error("Application email failed:", error.message);
    email = { sent: false, reason: "SMTP_ERROR" };
  }
  res.status(201).json({ id: x.id, ok: true, emailSent: email.sent });
});
app.get("/api/v1/public/jobs", (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT * FROM job_listings WHERE status='active' ORDER BY created_at DESC",
      )
      .all(),
  ),
);
app.get(
  "/api/v1/system/email-status",
  require("./auth").authenticate,
  require("./auth").permit("settings.read"),
  async (req, res) => res.json(await mailer.verify()),
);
// Compatibility for the preserved public frontend.
const BID = "6a44dca7580bc27a93b13907";
app.get(`/api/apps/public/prod/public-settings/by-id/${BID}`, (req, res) =>
  res.json({ id: BID, public_settings: "public_without_login" }),
);
app.get(`/api/apps/${BID}/entities/User/me`, (req, res) =>
  res.status(401).json({ message: "Authentication required to view users" }),
);
app.post(`/api/apps/${BID}/analytics/track/batch`, (req, res) =>
  res.sendStatus(204),
);
app.post(`/api/app-logs/${BID}/log-user-in-app/:page`, (req, res) =>
  res.sendStatus(204),
);
const compat = {
  JobListing: "job_listings",
  JobApplication: "job_applications",
  Lead: "leads",
};
app.get(`/api/apps/${BID}/entities/:entity`, (req, res) => {
  const table = compat[req.params.entity];
  if (!table) return res.json([]);
  let rows = db
    .prepare(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 100`)
    .all();
  if (req.query.q)
    try {
      const filters = JSON.parse(req.query.q);
      rows = rows.filter((r) =>
        Object.entries(filters).every(([k, v]) => r[k] === v),
      );
    } catch {}
  res.json(rows);
});
app.post(`/api/apps/${BID}/entities/:entity`, (req, res) => {
  const table = compat[req.params.entity];
  if (!table) return res.sendStatus(404);
  const ts = now(),
    map = {
      JobApplication: [
        "job_id",
        "job_title",
        "full_name",
        "email",
        "phone",
        "experience",
        "status",
      ],
      Lead: [
        "full_name",
        "company",
        "email",
        "phone",
        "source",
        "score",
        "stage",
        "service_type",
        "message",
      ],
    }[req.params.entity];
  const data = Object.fromEntries(
    map.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]),
  );
  if (table === "job_applications" && !data.status) data.status = "pending";
  if (table === "leads") {
    if (!data.stage) data.stage = "new";
    if (!data.source) data.source = "website";
  }
  const row = { id: id(), ...data, created_at: ts, updated_at: ts },
    keys = Object.keys(row);
  db.prepare(
    `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
  ).run(...keys.map((k) => row[k]));
  res.status(201).json(row);
});
app.post(
  `/api/apps/${BID}/integration-endpoints/Core/SendEmail`,
  async (req, res) => {
    try {
      const result = await mailer.sendRaw({
        subject: req.body.subject,
        body: req.body.body,
        replyTo: req.body.reply_to,
      });
      if (!result.sent)
        return res
          .status(503)
          .json({
            message: "Email service is not configured",
            code: result.reason,
          });
      res.json({ ok: true, message_id: result.messageId });
    } catch (error) {
      console.error("Compatibility email failed:", error.message);
      res.status(502).json({ message: "Email delivery failed" });
    }
  },
);
app.use("/api", (req, res) =>
  res.status(404).json({ error: { code: "NOT_FOUND", message: "API endpoint not found" } }),
);
app.get("/manifest.json", (req, res) =>
  res.json({
    id: "/",
    name: "GRIS Maintenance & Staffing",
    short_name: "GRIS",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0B0E12",
    theme_color: "#C88A58",
    description: "Staffing, maintenance, cleaning and logistics services.",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  }),
);
app.get("/static/js/badge.js", (req, res) => res.type("js").send(""));
app.get(
  ["/dashboard", "/login", "/register", "/forgot-password", "/reset-password"],
  (req, res) => res.redirect(302, "/crm"),
);
app.get("/crm", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "crm.html")),
);
app.get("/crm/*path", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "crm.html")),
);
app.use(
  express.static(path.join(__dirname, "..", "public"), {
    index: false,
    maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`))
        res.setHeader("Cache-Control", "public,max-age=31536000,immutable");
      else if (file.endsWith(".html"))
        res.setHeader("Cache-Control", "no-cache");
    },
  }),
);
app.use((req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "index.html")),
);
app.use((err, req, res, next) => {
  console.error(err);
  try {
    db.prepare(
      "INSERT INTO monitoring_events(id,level,source,event_type,message,metadata,created_at) VALUES(?,?,?,?,?,?,?)",
    ).run(
      id(),
      "error",
      "api",
      "unhandled_error",
      String(err.message || err).slice(0, 1000),
      JSON.stringify({
        path: req.path,
        request_id: res.getHeader("X-Request-Id"),
      }),
      now(),
    );
  } catch {}
  res
    .status(500)
    .json({
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "Unexpected server error"
            : err.message,
      },
    });
});
module.exports = app;
