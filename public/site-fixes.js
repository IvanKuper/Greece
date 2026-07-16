(function () {
  const submitLabels = [
    "שלח מועמדות",
    "Submit Application",
    "Отправить заявку",
  ];
  const publicHashRoutes = {
    "#hero": "/",
    "#services": "/#services",
    "#projects": "/#projects",
    "#calculator": "/#calculator",
    "#about": "/about",
    "#jobs": "/#jobs",
    "#faq": "/#faq",
    "#contact": "/contact",
  };
  let business = null;
  function patchJobs() {
    for (const button of document.querySelectorAll("button")) {
      if (!submitLabels.some((x) => button.textContent.includes(x))) continue;
      const dialog =
        button.closest('[role="dialog"]') ||
        button.parentElement?.parentElement?.parentElement;
      const inputs = dialog
        ? [...dialog.querySelectorAll("input,textarea")]
        : [];
      const name = inputs.find((x) =>
          /שמכם|your name|ваше имя/i.test(x.placeholder || ""),
        ),
        phone = inputs.find((x) =>
          /050-|phone|телефон/i.test(x.placeholder || ""),
        );
      if (name?.value.trim() && phone?.value.trim()) {
        button.disabled = false;
        button.removeAttribute("disabled");
        button.style.pointerEvents = "auto";
      }
    }
  }
  function patchCrmLinks() {
    for (const link of document.querySelectorAll('a[href="/dashboard"]'))
      link.setAttribute("href", "/crm");
  }
  function patchPublicNavigation() {
    for (const link of document.querySelectorAll('a[href^="#"]')) {
      const currentHref = link.getAttribute("href"),
        destination = publicHashRoutes[currentHref];
      if (destination) link.setAttribute("href", destination);
    }
  }
  function repairBrokenHashPath() {
    if (location.pathname === "/" || !location.hash) return false;
    const destination = publicHashRoutes[location.hash];
    if (!destination) return false;
    location.replace(destination);
    return true;
  }
  async function submitApplication(button) {
    const dialog =
        button.closest('[role="dialog"]') ||
        button.parentElement?.parentElement?.parentElement,
      inputs = [...dialog.querySelectorAll("input,textarea")],
      value = (pattern) =>
        inputs.find((x) => pattern.test(x.placeholder || ""))?.value.trim() ||
        "",
      full_name = value(/שמכם|your name|ваше имя/i),
      phone = value(/050-|phone|телефон/i),
      email = value(/email/i),
      experience = value(/עצמכם|yourself|себе/i),
      heading = dialog.querySelector("h2,h3")?.textContent || "",
      job_title = heading.split(/—| - /).slice(1).join(" ").trim();
    if (!full_name || !phone) return;
    button.disabled = true;
    button.textContent = "…";
    try {
      const r = await fetch("/api/v1/public/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name,
          phone,
          email,
          experience,
          job_title,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error?.message || "Failed to submit");
      dialog.innerHTML = `<div class="text-center py-10"><div class="w-16 h-16 rounded-full bg-copper text-white grid place-items-center text-3xl mx-auto mb-5">✓</div><h3 class="text-2xl font-display font-bold">המועמדות נשלחה בהצלחה!</h3><p class="text-muted-foreground mt-3">ניצור איתך קשר בהקדם</p><button type="button" onclick="this.closest('[role=dialog]')?.parentElement?.remove()" class="mt-6 px-6 py-3 rounded-full bg-copper text-white">סגירה</button></div>`;
    } catch (error) {
      button.disabled = false;
      button.textContent = "שלח מועמדות";
      let msg = dialog.querySelector("[data-application-error]");
      if (!msg) {
        msg = document.createElement("p");
        msg.dataset.applicationError = "true";
        msg.className = "text-red-400 text-sm mt-2";
        button.before(msg);
      }
      msg.textContent = error.message;
    }
  }
  function enhancePublicPage() {
    const main =
      document.querySelector("main") || document.querySelector("#root > div");
    if (main && !main.id) main.id = "main-content";
    if (main && main.tagName !== "MAIN") main.setAttribute("role", "main");
    if (!document.querySelector(".skip-link")) {
      const link = document.createElement("a");
      link.href = "#main-content";
      link.className = "skip-link";
      link.textContent = "דלג לתוכן הראשי";
      document.body.prepend(link);
    }
    for (const [index, img] of [...document.images].entries()) {
      if (index > 0 && !img.loading) img.loading = "lazy";
      img.decoding = "async";
      if (!img.hasAttribute("alt")) img.alt = "";
    }
    for (const button of document.querySelectorAll(
      "button:not([aria-label])",
    )) {
      const text = button.textContent.trim();
      if (!text && button.title)
        button.setAttribute("aria-label", button.title);
    }
    for (const input of document.querySelectorAll('input[type="range"]')) {
      if (!input.getAttribute("aria-label"))
        input.setAttribute(
          "aria-label",
          input.max === "24" ? "שעות עבודה נדרשות" : "מספר עובדים נדרש",
        );
    }
    if (business) applyBusinessDetails();
  }
  function applyBusinessDetails() {
    const mail = `mailto:${business.email}`,
      phone = `tel:${business.phone.replace(/[^+\d]/g, "")}`;
    for (const a of document.querySelectorAll('a[href^="mailto:"]'))
      if (a.getAttribute("href") !== mail) a.href = mail;
    for (const a of document.querySelectorAll('a[href^="tel:"]')) {
      if (a.getAttribute("href") !== phone) a.href = phone;
      const numberText = a.querySelector('span[dir="ltr"]');
      if (numberText && numberText.textContent !== business.phone)
        numberText.textContent = business.phone;
    }
    let panel = document.querySelector("[data-business-info]");
    const footer = document.querySelector("footer");
    if (footer && !panel) {
      panel = document.createElement("section");
      panel.dataset.businessInfo = "true";
      panel.className = "business-info";
      panel.setAttribute("aria-label", "פרטי העסק");
      footer.prepend(panel);
    }
    const html = `<div><strong>${safe(business.company_name)}</strong><span>ח.פ. ${safe(business.company_number)}</span></div><a href="${safe(phone)}">${safe(business.phone)}</a><a href="${safe(mail)}">${safe(business.email)}</a><span>${safe(business.address)}</span><span>${safe(business.hours)}</span>`;
    if (panel && panel.innerHTML !== html) panel.innerHTML = html;
    const data = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: business.company_name,
        email: business.email,
        telephone: business.phone,
        address: business.address,
      }),
      schema =
        document.querySelector("script[data-runtime-business]") ||
        document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.runtimeBusiness = "true";
    if (schema.textContent !== data) schema.textContent = data;
    if (!schema.isConnected) document.head.append(schema);
  }
  const safe = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  async function loadBusiness() {
    try {
      const r = await fetch("/api/v1/public/business");
      if (r.ok) {
        business = await r.json();
        applyBusinessDetails();
      }
    } catch {}
  }
  function patch() {
    patchJobs();
    patchCrmLinks();
    patchPublicNavigation();
    enhancePublicPage();
  }
  document.addEventListener("input", () => queueMicrotask(patch), true);
  document.addEventListener(
    "click",
    (e) => {
      const application = e.target.closest("button");
      if (
        application &&
        submitLabels.some((x) => application.textContent.includes(x))
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        submitApplication(application);
        return;
      }
      const link = e.target.closest('a[href="/crm"]');
      if (link) {
        e.preventDefault();
        e.stopImmediatePropagation();
        location.assign("/crm");
      }
    },
    true,
  );
  new MutationObserver(patch).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["disabled", "href"],
  });
  addEventListener("DOMContentLoaded", () => {
    if (repairBrokenHashPath()) return;
    patch();
    loadBusiness();
  });
  setTimeout(patch, 500);
})();
