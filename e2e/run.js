const puppeteer = require("puppeteer-core");
const { AxePuppeteer } = require("@axe-core/puppeteer");
const assert = require("node:assert/strict");
const { db } = require("../src/db");

const base = process.env.E2E_BASE_URL || "http://localhost:3000";

(async () => {
  const browser = await puppeteer.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage(), errors = [];
    await page.setViewport({ width: 1440, height: 900 });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/", { waitUntil: "networkidle0" });
    await page.waitForSelector("#contact-form");

    const crmLink = await page.$('a.crm-login[href="/crm"]');
    assert.ok(crmLink, "Public navigation is missing CRM login");
    assert.equal(
      await crmLink.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }),
      true,
      "CRM login is not visible on desktop",
    );
    assert.ok(await page.$(".skip-link"));
    assert.ok(await page.$("main#main-content"));

    const publicA11y = await new AxePuppeteer(page).analyze();
    assert.equal(
      publicA11y.violations.filter((violation) => violation.impact === "critical")
        .length,
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
      document.body.textContent.includes("הפנייה נשלחה בהצלחה"),
    );
    assert.ok(
      db.prepare("SELECT 1 FROM leads WHERE email=?").get(
        "e2e-contact@example.com",
      ),
      "Contact was not saved",
    );
    assert.deepEqual(errors, [], "Public home emitted browser errors");
    console.log("✓ Public design, visible CRM login, contact form, and accessibility");

    await page.goto(base + "/applications", { waitUntil: "networkidle0" });
    await page.waitForSelector("[data-apply-job]");
    await page.click("[data-apply-job]");
    await page.type("#application-name", "E2E Applicant");
    await page.type("#application-phone", "0500008888");
    await page.type("#application-email", "e2e-applicant@example.com");
    await page.type("#application-experience", "Automated application test");
    await page.click('#application-form button[type="submit"]');
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
      const routePage = await browser.newPage(), routeErrors = [];
      routePage.on("pageerror", (error) => routeErrors.push(error.message));
      await routePage.goto(base + route, { waitUntil: "networkidle0" });
      assert.ok(
        (await routePage.$eval("body", (element) => element.innerText.length)) >
          100,
        `${route} did not render`,
      );
      assert.ok(await routePage.$('a.crm-login[href="/crm"]'));
      assert.deepEqual(routeErrors, [], `${route} emitted browser errors`);
      await routePage.close();
    }
    console.log("✓ Every public route renders and links to CRM");

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
    assert.ok(await themePage.$('a.crm-login[href="/crm"]'));
    await themePage.click('[data-action="theme"]');
    const light = await themePage.$eval(
      "body",
      (element) => getComputedStyle(element).backgroundColor,
    );
    assert.notEqual(dark, light);
    await themePage.click('[data-action="menu"]');
    assert.equal(
      await themePage.$eval("#mobile-menu", (element) =>
        element.classList.contains("open"),
      ),
      true,
    );
    await themePage.close();
    console.log("✓ Mobile menu, CRM access, and dark/light theme");

    const crmPage = await browser.newPage(), crmErrors = [];
    crmPage.on("pageerror", (error) => crmErrors.push(error.message));
    await crmPage.goto(base + "/crm", { waitUntil: "networkidle0" });
    await crmPage.waitForSelector('#loginForm button[type="submit"]');
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
