const puppeteer = require("puppeteer-core");
const { AxePuppeteer } = require("@axe-core/puppeteer");
const assert = require("node:assert/strict");
const { db } = require("../src/db");

const base = process.env.E2E_BASE_URL || "http://localhost:3000";

const clickSubmit = (page) =>
  page.click('#stable-contact-form button[type="submit"]');

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
    await page.setViewport({ width: 1440, height: 900 });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/", { waitUntil: "networkidle0" });
    await page.waitForFunction(() =>
      document.body.textContent.includes("GREECE") ||
      document.body.textContent.includes("כוח אדם"),
    );
    await page.waitForSelector("#stable-contact-form");

    const crmLink = await page.$('a[href="/crm"]');
    assert.ok(crmLink, "Base44 navigation is missing the CRM link");
    assert.ok(await page.$(".skip-link"));
    assert.ok(await page.$('#main-content[role="main"], main#main-content'));
    assert.ok(
      await page.evaluate(() =>
        [...document.scripts].some((script) =>
          script.src.includes("/assets/index-ZcaRxVCl.js"),
        ),
      ),
      "The original Base44 bundle is not loaded",
    );

    const publicA11y = await new AxePuppeteer(page).analyze();
    assert.equal(
      publicA11y.violations.filter((violation) => violation.impact === "critical")
        .length,
      0,
      "Public page has critical accessibility violations",
    );

    await page.click("[data-service='staffing']");
    await clickSubmit(page);
    await page.type('[data-contact-field="location"]', "Tel Aviv");
    await page.type('[data-contact-field="workers"]', "4");
    await page.type(
      '[data-contact-field="message"]',
      "Automated contact flow test",
    );
    await clickSubmit(page);
    await page.type('[data-contact-field="full_name"]', "E2E Contact");
    await page.type('[data-contact-field="phone"]', "0500009999");
    await page.type('[data-contact-field="email"]', "e2e-contact@example.com");
    await page.type('[data-contact-field="company"]', "E2E Ltd");
    await clickSubmit(page);
    await clickSubmit(page);
    await page.waitForFunction(() =>
      document.body.textContent.includes("הפנייה נשלחה בהצלחה") ||
      document.body.textContent.includes("תודה! הפנייה נשלחה בהצלחה"),
    );
    assert.ok(
      db.prepare("SELECT 1 FROM leads WHERE email=?").get(
        "e2e-contact@example.com",
      ),
      "Contact was not saved",
    );
    assert.deepEqual(errors, [], "Base44 public home emitted browser errors");
    console.log("✓ Original Base44 frontend, CRM link, contact form, and accessibility");

    await page.goto(base + "/#jobs", { waitUntil: "networkidle0" });
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some((button) =>
        button.textContent.includes("הגש מועמדות"),
      ),
    );
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent.includes("הגש מועמדות"))
        .click(),
    );
    await page.type('input[placeholder="הכניסו את שמכם"]', "E2E Applicant");
    await page.type('input[placeholder="050-0000000"]', "0500008888");
    await page.type('input[placeholder="email@example.com"]', "e2e-applicant@example.com");
    await page.type(
      'textarea[placeholder="ספרו לנו קצת על עצמכם"]',
      "Automated application flow test",
    );
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent.includes("שלח מועמדות"))
        .click(),
    );
    await page.waitForFunction(() =>
      document.body.textContent.includes("המועמדות נשלחה בהצלחה"),
    );
    assert.ok(
      db.prepare("SELECT 1 FROM job_applications WHERE email=?").get(
        "e2e-applicant@example.com",
      ),
      "Application was not saved",
    );
    console.log("✓ Job application flow");

    for (const route of [
      "/about",
      "/contact",
      "/certifications",
      "/process",
      "/applications",
    ]) {
      const routePage = await browser.newPage(),
        routeErrors = [];
      routePage.on("pageerror", (error) => routeErrors.push(error.message));
      await routePage.goto(base + route, { waitUntil: "networkidle0" });
      assert.ok(
        (await routePage.$eval("body", (element) => element.innerText.length)) >
          100,
        `${route} did not render`,
      );
      assert.ok(await routePage.$('a[href="/crm"]'));
      assert.deepEqual(routeErrors, [], `${route} emitted browser errors`);
      await routePage.close();
    }
    console.log("✓ Base44 public routes render and link to CRM");

    const navigationPage = await browser.newPage();
    await navigationPage.goto(base + "/process#about", {
      waitUntil: "networkidle0",
    });
    await navigationPage.waitForFunction(
      () => location.pathname === "/about" && location.hash === "",
    );
    await navigationPage.close();
    console.log("✓ Legacy broken hash routes normalize correctly");

    const themePage = await browser.newPage();
    await themePage.setViewport({ width: 390, height: 844 });
    await themePage.goto(base + "/", { waitUntil: "networkidle0" });
    const dark = await themePage.$eval(
      "body",
      (element) => getComputedStyle(element).backgroundColor,
    );
    await themePage.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const themeButton = buttons.find((button) => {
        const label = `${button.getAttribute("aria-label") || ""} ${button.title || ""}`;
        return /theme|dark|light|מצב|ערכת|צבע/i.test(label);
      });
      if (!themeButton) throw new Error("Theme button not found");
      themeButton.click();
    });
    await new Promise((resolve) => setTimeout(resolve, 450));
    const light = await themePage.$eval(
      "body",
      (element) => getComputedStyle(element).backgroundColor,
    );
    assert.notEqual(dark, light);
    assert.ok(await themePage.$('a[href="/crm"]'));
    await themePage.close();
    console.log("✓ Dark/light theme and mobile CRM access");

    const crmPage = await browser.newPage(),
      crmErrors = [];
    crmPage.on("pageerror", (error) => crmErrors.push(error.message));
    await crmPage.goto(base + "/crm", { waitUntil: "networkidle0" });
    await crmPage.waitForSelector('#loginForm button[type="submit"]');
    await crmPage.type('#loginForm input[name="email"]', "admin@greece.co.il");
    await crmPage.type('#loginForm input[name="password"]', "Admin123!");
    await crmPage.click('#loginForm button[type="submit"]');
    await crmPage.waitForFunction(() =>
      document.body.textContent.includes("Executive overview"),
    );
    const crmA11y = await new AxePuppeteer(crmPage).analyze();
    assert.equal(
      crmA11y.violations.filter((violation) => violation.impact === "critical")
        .length,
      0,
      "CRM has critical accessibility violations",
    );
    assert.deepEqual(crmErrors, [], "CRM emitted browser errors");
    await crmPage.close();
    console.log("✓ CRM login and authenticated dashboard");
  } finally {
    db.prepare("DELETE FROM leads WHERE email=?").run(
      "e2e-contact@example.com",
    );
    db.prepare("DELETE FROM job_applications WHERE email=?").run(
      "e2e-applicant@example.com",
    );
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
