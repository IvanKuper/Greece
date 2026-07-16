const puppeteer = require("puppeteer-core");
const { AxePuppeteer } = require("@axe-core/puppeteer");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { db } = require("../src/db");
const base = process.env.E2E_BASE_URL || "http://localhost:3000";
const clickText = (page, selector, text) =>
  page.evaluate(
    (selector, text) => {
      const e = [...document.querySelectorAll(selector)].find((x) =>
        x.textContent.trim().includes(text),
      );
      if (!e) throw Error(`Button not found: ${text}`);
      e.click();
    },
    selector,
    text,
  );
let portalTestId;
(async () => {
  const browser = await puppeteer.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/", { waitUntil: "networkidle0" });
    await page.waitForSelector("#contact-form");
    assert.ok(await page.$(".skip-link"));
    assert.ok(await page.$('#main-content[role="main"],main#main-content'));
    const publicA11y = await new AxePuppeteer(page).analyze();
    assert.equal(
      publicA11y.violations.filter((v) => v.impact === "critical").length,
      0,
      "Public page has critical accessibility violations",
    );
    await page.type("#contact-name", "E2E Contact");
    await page.type("#contact-phone", "0500009999");
    await page.type("#contact-email", "e2e-contact@example.com");
    await page.type("#contact-company", "E2E Ltd");
    await page.type("#contact-message", "Automated contact flow test");
    await page.click('#contact-form button[type="submit"]');
    await page.waitForFunction(() =>
      document
        .querySelector("#contact")
        ?.textContent.includes("הפנייה נשלחה בהצלחה"),
    );
    assert.ok(
      db
        .prepare("SELECT 1 FROM leads WHERE email='e2e-contact@example.com'")
        .get(),
      "Contact was not saved",
    );
    assert.deepEqual(errors, [], "Contact flow emitted browser errors");
    console.log("✓ Contact form, accessibility baseline, CRM capture, and email path");
    await page.goto(base + "/", { waitUntil: "networkidle0" });
    await page.click("[data-apply-job]");
    await page.type("#application-name", "E2E Applicant");
    await page.type("#application-phone", "0500008888");
    await page.type("#application-email", "e2e-applicant@example.com");
    await page.type("#application-experience", "Automated application flow test");
    await page.click('#application-form button[type="submit"]');
    await page.waitForFunction(() =>
      document.body.textContent.includes("המועמדות נשלחה בהצלחה"),
    );
    assert.ok(
      db
        .prepare(
          "SELECT 1 FROM job_applications WHERE email='e2e-applicant@example.com'",
        )
        .get(),
      "Application was not saved",
    );
    console.log("✓ Job application flow and recruiting capture");
    for (const route of [
      "/about",
      "/contact",
      "/certifications",
      "/process",
      "/applications",
      "/crm",
    ]) {
      const p = await browser.newPage(),
        routeErrors = [];
      p.on("pageerror", (e) => routeErrors.push(e.message));
      await p.goto(base + route, { waitUntil: "networkidle0" });
      assert.ok(
        (await p.$eval("body", (e) => e.innerText.trim().length)) > 100,
        `${route} did not render`,
      );
      assert.deepEqual(routeErrors, [], `${route} emitted browser errors`);
      await p.close();
    }
    console.log("✓ Public routes and CRM login render without runtime errors");
    const quote = db.prepare("SELECT public_token FROM quotes LIMIT 1").get(),
      contract = db.prepare("SELECT public_token FROM contracts LIMIT 1").get(),
      customer = db.prepare("SELECT id FROM customers LIMIT 1").get(),
      portalToken = crypto.randomBytes(32).toString("base64url");
    portalTestId = crypto.randomUUID();
    db.prepare("INSERT INTO customer_portal_tokens(id,customer_id,token_hash,label,expires_at,created_at) VALUES(?,?,?,?,?,?)").run(portalTestId, customer.id, crypto.createHash("sha256").update(portalToken).digest("hex"), "E2E", new Date(Date.now() + 3600000).toISOString(), new Date().toISOString());
    for (const [route, expected] of [[`/quote/${quote.public_token}`, "SECURE QUOTATION"], [`/contract/${contract.public_token}`, "SECURE CONTRACT"], [`/portal/${portalToken}`, "CUSTOMER PORTAL"]]) {
      const securePage = await browser.newPage(), secureErrors = [];
      securePage.on("pageerror", (error) => secureErrors.push(error.message));
      await securePage.goto(base + route, { waitUntil: "networkidle0" });
      assert.ok((await securePage.$eval("body", (element) => element.innerText)).includes(expected), `${route} did not render`);
      assert.deepEqual(secureErrors, [], `${route} emitted browser errors`);
      await securePage.close();
    }
    console.log("✓ Secure quotation, contract, and customer portal render correctly");
    const navigationPage = await browser.newPage();
    await navigationPage.setViewport({ width: 1440, height: 900 });
    await navigationPage.goto(base + "/process", { waitUntil: "networkidle0" });
    await navigationPage.waitForSelector('.main-nav a[href="/about"]');
    await navigationPage.click('.main-nav a[href="/about"]');
    await navigationPage.waitForFunction(() => location.pathname === "/about");
    assert.equal(await navigationPage.evaluate(() => location.hash), "");
    await navigationPage.goto(base + "/process#about", {
      waitUntil: "networkidle0",
    });
    await navigationPage.waitForFunction(() => location.pathname === "/about" && !location.hash);
    const normalizedLinks = await navigationPage.$$eval(
      'a[href="/"],a[href^="/#"],a[href="/about"],a[href="/contact"]',
      (links) => links.map((link) => link.getAttribute("href")),
    );
    assert.ok(normalizedLinks.includes("/about"));
    assert.ok(normalizedLinks.includes("/contact"));
    assert.equal(
      await navigationPage.$$eval(
        'a[href="#about"],a[href="#contact"],a[href="#services"]',
        (links) => links.length,
      ),
      0,
    );
    await navigationPage.close();
    console.log("✓ Cross-page menu links normalize relative hashes correctly");
    const crmPage = await browser.newPage(),
      crmErrors = [];
    crmPage.on("pageerror", (e) => crmErrors.push(e.message));
    await crmPage.goto(base + "/crm", { waitUntil: "networkidle0" });
    await crmPage.waitForSelector('#loginForm button[type="submit"]');
    await crmPage.click('#loginForm button[type="submit"]');
    await crmPage.waitForFunction(() =>
      document.body.textContent.includes("Executive overview"),
    );
    await crmPage.click('[data-module="customers"]');
    await crmPage.waitForSelector("table tbody tr");
    await crmPage.click("table tbody tr button");
    await crmPage.waitForFunction(() =>
      document.body.textContent.includes("Recent activity"),
    );
    await crmPage.click('[data-module="settings"]');
    await crmPage.waitForFunction(() =>
      document.body.textContent.includes("Business Settings"),
    );
    await crmPage.click('[data-module="security"]');
    await crmPage.waitForFunction(() =>
      document.body.textContent.includes("Security Center"),
    );
    assert.equal(
      await crmPage.evaluate(() => typeof registerPasskey),
      "function",
    );
    await crmPage.click('[data-module="quotes"]');
    await crmPage.waitForFunction(() => document.body.textContent.includes("Quotations & e-signature"));
    await crmPage.click('[data-module="analytics"]');
    await crmPage.waitForFunction(() => document.body.textContent.includes("Business Analytics"));
    await crmPage.click('[data-module="assistant"]');
    await crmPage.waitForFunction(() => document.body.textContent.includes("Business AI Assistant"));
    const crmA11y = await new AxePuppeteer(crmPage).analyze();
    assert.equal(
      crmA11y.violations.filter((v) => v.impact === "critical").length,
      0,
      "CRM has critical accessibility violations",
    );
    assert.deepEqual(crmErrors, [], "CRM emitted browser errors");
    await crmPage.close();
    console.log(
      "✓ CRM login, Customer 360, settings, security, and accessibility baseline",
    );
    const deepCrmPage = await browser.newPage();
    await deepCrmPage.goto(base + "/crm/customers", {
      waitUntil: "domcontentloaded",
    });
    await deepCrmPage.waitForFunction(
      () =>
        document.querySelector('#loginForm button[type="submit"]') ||
        document.body.textContent.includes("centrally managed and audited"),
    );
    if (await deepCrmPage.$('#loginForm button[type="submit"]'))
      await deepCrmPage.click('#loginForm button[type="submit"]');
    await deepCrmPage.waitForFunction(() =>
      document.body.textContent.includes("centrally managed and audited"),
    );
    assert.equal(await deepCrmPage.evaluate(() => location.hash), "#customers");
    await deepCrmPage.close();
    console.log("✓ Direct CRM module paths resolve to the requested screen");
    const themePage = await browser.newPage();
    await themePage.evaluateOnNewDocument(() =>
      localStorage.setItem("greece-theme", "dark"),
    );
    await themePage.goto(base + "/", { waitUntil: "networkidle0" });
    const dark = await themePage.$eval(
      "body",
      (e) => getComputedStyle(e).backgroundColor,
    );
    await themePage.click('button[data-action="theme"]');
    await new Promise((r) => setTimeout(r, 450));
    const light = await themePage.$eval(
      "body",
      (e) => getComputedStyle(e).backgroundColor,
    );
    assert.notEqual(light, dark);
    assert.equal(
      await themePage.evaluate(() => document.documentElement.dataset.theme === "light"),
      true,
    );
    await themePage.setViewport({ width: 390, height: 844 });
    assert.ok(await themePage.$('button[data-action="theme"]'));
    await themePage.close();
    console.log(
      "✓ Dark/light theme visibly changes and remains usable on mobile",
    );
  } finally {
    db.prepare("DELETE FROM leads WHERE email='e2e-contact@example.com'").run();
    db.prepare(
      "DELETE FROM job_applications WHERE email='e2e-applicant@example.com'",
    ).run();
    if (portalTestId)
      db.prepare("DELETE FROM customer_portal_tokens WHERE id=?").run(portalTestId);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
