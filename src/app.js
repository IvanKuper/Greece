// @ts-nocheck - not yet type-annotated (helmet CJS/ESM interop + a query-param
// type narrowing). Revisit in a future milestone.
const express = require("express");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");
const crypto = require("crypto");
const { db, id, now } = require("./db");
const { authRoutes } = require("./auth");
const { apiRoutes } = require("./api");
const mailer = require("./mailer");
const push = require("./push");
const { businessOSRoutes } = require("./business-os");
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.secure || req.get("x-forwarded-proto") === "https") return next();
    res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
  });
}
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "https://images.unsplash.com",
        ],
        connectSrc: ["'self'"],
        reportUri: ["/api/csp-report"],
      },
    },
  }),
);
app.use(compression());
app.use(
  express.json({
    limit: "15mb",
    type: ["application/json", "application/csp-report", "application/reports+json"],
  }),
);
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
  windowMs: 10 * 60000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const isHoneypotFilled = (req) => Boolean(String(req.body.website || "").trim());
app.use("/api", limiter);
app.use((req, res, next) => {
  res.setHeader("X-Request-Id", crypto.randomUUID());
  next();
});
authRoutes(app, loginLimiter);
apiRoutes(app);
businessOSRoutes(app);
app.get("/api/health", (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({
      status: "healthy",
      version: "2.1.0",
      time: now(),
      uptime: Math.round(process.uptime()),
    });
  } catch {
    res.status(503).json({ status: "unhealthy" });
  }
});
app.post("/api/v1/public/leads", publicFormLimiter, async (req, res) => {
  if (isHoneypotFilled(req)) return res.status(201).json({ id: id(), ok: true, emailSent: false });
  if (!req.body.full_name || !req.body.phone)
    return res
      .status(400)
      .json({ error: { message: "Name and phone are required" } });
  const ts = now(),
    x = {
      id: id(),
      full_name: String(req.body.full_name).slice(0, 120),
      company: String(req.body.company || ""),
      email: String(req.body.email || ""),
      phone: String(req.body.phone).slice(0, 40),
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
  let email;
  try {
    email = await mailer.sendLead(x);
  } catch (error) {
    console.error("Contact email failed:", error);
    email = { sent: false, reason: "SMTP_ERROR" };
  }
  push
    .sendToAdmins({
      title: "New lead",
      body: `${x.full_name}${x.company ? " · " + x.company : ""}`,
      url: "/crm#leads",
    })
    .catch(() => {});
  res.status(201).json({ id: x.id, ok: true, emailSent: email.sent });
});
app.post("/api/v1/public/applications", publicFormLimiter, async (req, res) => {
  if (isHoneypotFilled(req)) return res.status(201).json({ id: id(), ok: true, emailSent: false });
  if (!req.body.full_name || !req.body.phone)
    return res
      .status(400)
      .json({ error: { message: "Name and phone are required" } });
  const ts = now(),
    x = {
      id: id(),
      job_id: req.body.job_id || null,
      job_title: req.body.job_title || "",
      full_name: req.body.full_name,
      email: req.body.email || "",
      phone: req.body.phone,
      experience: req.body.experience || "",
      status: "pending",
      created_at: ts,
      updated_at: ts,
    };
  db.prepare(
    "INSERT INTO job_applications VALUES(@id,@job_id,@job_title,@full_name,@email,@phone,@experience,@status,@created_at,@updated_at)",
  ).run(x);
  let email;
  try {
    email = await mailer.sendApplication(x);
  } catch (error) {
    console.error("Application email failed:", error.message);
    email = { sent: false, reason: "SMTP_ERROR" };
  }
  push
    .sendToAdmins({
      title: "New job application",
      body: `${x.full_name}${x.job_title ? " · " + x.job_title : ""}`,
      url: "/crm#job_applications",
    })
    .catch(() => {});
  res.status(201).json({ id: x.id, ok: true, emailSent: email.sent });
});
app.post("/api/v1/public/web-vitals", (req, res) => res.sendStatus(204));
app.post("/api/csp-report", (req, res) => {
  const report = req.body?.["csp-report"] || req.body || {};
  try {
    db.prepare(
      "INSERT INTO monitoring_events(id,level,source,event_type,message,metadata,created_at) VALUES(?,?,?,?,?,?,?)",
    ).run(
      id(),
      "warning",
      "csp",
      "csp_violation",
      String(report["violated-directive"] || "unknown directive").slice(0, 500),
      JSON.stringify({
        blockedUri: report["blocked-uri"],
        documentUri: report["document-uri"],
        sourceFile: report["source-file"],
      }),
      now(),
    );
  } catch {}
  res.sendStatus(204);
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
app.get("/manifest.json", (req, res) =>
  res.json({
    name: "Greece Maintenance & Staffing",
    short_name: "Greece",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0E12",
    theme_color: "#C88A58",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  }),
);
const SITE_ORIGIN = process.env.PUBLIC_APP_URL || "https://greece.up.railway.app";
app.get("/robots.txt", (req, res) =>
  res.type("text/plain").send(
    `User-agent: *\nDisallow: /crm\nDisallow: /api/\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
  ),
);
app.get("/sitemap.xml", (req, res) => {
  const pages = [
    { path: "", priority: "1.0" },
    { path: "/contact", priority: "0.9" },
    { path: "/applications", priority: "0.8" },
    { path: "/about", priority: "0.7" },
    { path: "/process", priority: "0.6" },
    { path: "/certifications", priority: "0.6" },
  ];
  const lastmod = now().slice(0, 10);
  const urls = pages
    .map(
      ({ path: p, priority }) =>
        `<url><loc>${SITE_ORIGIN}${p}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`,
    )
    .join("");
  res
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    );
});
app.get(
  ["/dashboard", "/login", "/register", "/forgot-password", "/reset-password"],
  (req, res) => res.redirect(302, "/crm"),
);
const crmHtmlPath = path.join(__dirname, "..", "public", "crm.html");
const serveCrmHtml = (req, res) => {
  const html = fs
    .readFileSync(crmHtmlPath, "utf-8")
    .replaceAll("<script", `<script nonce="${res.locals.nonce}"`);
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(html);
};
app.get("/crm", serveCrmHtml);
app.get("/crm/*path", serveCrmHtml);
app.use(
  express.static(path.join(__dirname, "..", "public"), {
    index: false,
    maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`))
        res.setHeader("Cache-Control", "public,max-age=31536000,immutable");
      else if (file.endsWith(".html") || path.basename(file) === "sw.js")
        res.setHeader("Cache-Control", "no-cache");
    },
  }),
);
const indexHtmlPath = path.join(__dirname, "..", "public", "index.html");
const PAGE_TITLES = {
  "/about": "About",
  "/process": "Process",
  "/certifications": "Certifications",
  "/applications": "Job Applications",
  "/contact": "Contact",
};
const DAY_ABBR = {
  Sun: "Su",
  Mon: "Mo",
  Tue: "Tu",
  Wed: "We",
  Thu: "Th",
  Fri: "Fr",
  Sat: "Sa",
};
function localBusinessSchema() {
  const cfg = Object.fromEntries(
    db
      .prepare("SELECT key,value FROM business_settings")
      .all()
      .map((r) => [r.key, r.value]),
  );
  if (!cfg.company_name) return null;
  const addressParts = String(cfg.address || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let openingHours;
  if (cfg.hours) {
    openingHours = cfg.hours;
    for (const [full, short] of Object.entries(DAY_ABBR))
      openingHours = openingHours.replaceAll(full, short);
  }
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: cfg.company_name,
    url: SITE_ORIGIN,
    ...(cfg.phone ? { telephone: cfg.phone } : {}),
    ...(cfg.email ? { email: cfg.email } : {}),
    ...(addressParts.length
      ? {
          address: {
            "@type": "PostalAddress",
            ...(addressParts[0] ? { streetAddress: addressParts[0] } : {}),
            ...(addressParts[1] ? { addressLocality: addressParts[1] } : {}),
            ...(addressParts[2] ? { addressCountry: addressParts[2] } : {}),
          },
        }
      : {}),
    ...(openingHours ? { openingHours } : {}),
  };
}
app.use((req, res) => {
  const pageTitle = PAGE_TITLES[req.path];
  let html = fs.readFileSync(indexHtmlPath, "utf-8");
  const schemas = [];
  if (pageTitle)
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
        {
          "@type": "ListItem",
          position: 2,
          name: pageTitle,
          item: `${SITE_ORIGIN}${req.path}`,
        },
      ],
    });
  const localBusiness = localBusinessSchema();
  if (localBusiness) schemas.push(localBusiness);
  if (schemas.length)
    html = html.replace(
      "</head>",
      `${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("")}</head>`,
    );
  html = html.replaceAll("<script", `<script nonce="${res.locals.nonce}"`);
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(html);
});
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
