// @ts-nocheck - not yet type-annotated; DOM lookups here return the generic
// `Element` type until specific element types are declared. Revisit in a future milestone.
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
  // The compiled forms put <label> next to the field without linking them; link them for screen readers.
  let labelSeq = 0;
  function linkLabels() {
    for (const label of document.querySelectorAll("label:not([for])")) {
      if (label.querySelector("input,textarea,select")) continue;
      const field = label.nextElementSibling?.matches("input,textarea,select")
        ? label.nextElementSibling
        : label.parentElement?.querySelector("input,textarea,select");
      if (!field) continue;
      if (!field.id) field.id = "field-" + ++labelSeq;
      label.setAttribute("for", field.id);
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
    const footer = document.querySelector("footer");
    if (footer && !footer.querySelector("[data-a11y-statement]")) {
      const line = document.createElement("p");
      line.className = "a11y-statement-link";
      line.innerHTML = '<a data-a11y-statement href="/accessibility">הצהרת נגישות</a>';
      footer.append(line);
    }
    if (!document.querySelector(".wa-float")) {
      const wa = document.createElement("a");
      wa.className = "wa-float";
      wa.href = "https://wa.me/972508816116?text=" + encodeURIComponent("שלום, הגעתי מהאתר של GREECE ואשמח לקבל פרטים");
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.setAttribute("aria-label", "שליחת הודעה בוואטסאפ (נפתח בחלון חדש)");
      wa.innerHTML = WA_ICON;
      document.body.append(wa);
    }
    queueWhatsApp();
    if (business) applyBusinessDetails();
  }
  const WA_ICON =
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.41 9.42-9.41 2.51 0 4.88.98 6.66 2.76a9.35 9.35 0 0 1 2.75 6.66c0 5.19-4.23 9.41-9.42 9.41zm8.02-17.43A11.27 11.27 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.66L.62 23.25l5.65-1.48a11.3 11.3 0 0 0 5.78 1.47h.01c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.32-8.01z"/></svg>';
  // On a phone every full-width control passes under the corner, so the floating button steps aside
  // while it would sit on a form field or form button, or while someone is filling a form.
  function syncWhatsApp() {
    const wa = document.querySelector(".wa-float");
    if (!wa) return;
    const r = wa.getBoundingClientRect();
    const coversForm = [...document.querySelectorAll("form button, input, textarea, select")].some((el) => {
      const b = el.getBoundingClientRect();
      return b.width && b.height && b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom;
    });
    const filling = Boolean(document.activeElement?.closest("form"));
    // The app's menus and pop-ups live in a lower layer than this button, so it hides while one is open.
    const overlayOpen = Boolean(document.querySelector(".fixed.inset-0.z-50, [role=dialog]"));
    wa.classList.toggle("wa-float--away", document.activeElement !== wa && (coversForm || filling || overlayOpen));
  }
  let waFrame = 0;
  const queueWhatsApp = () => {
    cancelAnimationFrame(waFrame);
    waFrame = requestAnimationFrame(syncWhatsApp);
  };
  addEventListener("scroll", queueWhatsApp, { passive: true });
  addEventListener("resize", queueWhatsApp);
  document.addEventListener("focusin", queueWhatsApp);
  document.addEventListener("focusout", queueWhatsApp);
  function applyBusinessDetails() {
    const mail = `mailto:${business.email}`,
      // The phone field can hold two numbers ("050-... / 052-..."): dial the first one.
      phone = `tel:${business.phone.split("/")[0].replace(/[^+\d]/g, "")}`;
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
  function applySiteBranding() {
    const titleMap = {
      "/": "Greece | כוח אדם והחזקה",
      "/about": "אודות | Greece",
      "/process": "תהליך העבודה | Greece",
      "/certifications": "תעודות והסמכות | Greece",
      "/applications": "קריירה | Greece",
      "/contact": "צור קשר | Greece",
    };
    const pageTitle = titleMap[location.pathname] || "Greece";
    document.title = pageTitle;
    const titleMeta = document.querySelector("meta[property='og:title']");
    if (titleMeta) titleMeta.content = pageTitle;
    const twitterTitleMeta = document.querySelector("meta[name='twitter:title']");
    if (twitterTitleMeta) twitterTitleMeta.content = pageTitle;
    const descriptionMeta = document.querySelector("meta[name='description']");
    if (descriptionMeta) descriptionMeta.content = "חברת GREECE — פתרונות כוח אדם והחזקה מקצועיים. שירות מהיר, אמין ואיכותי לעסקים ברחבי הארץ.";
    const canonical = document.querySelector("link[rel='canonical']");
    if (canonical)
      canonical.href = location.origin + location.pathname;
    // fast path: the full-DOM text scan only runs when the placeholder word is on the page
    if (/\bgris\b/i.test(document.body.textContent))
    for (const el of document.querySelectorAll("body *")) {
      if (!el.textContent) continue;
      const nextText = el.textContent.replace(/\bgris\b/gi, "Greece");
      if (nextText !== el.textContent) el.textContent = nextText;
    }
    for (const attr of ["aria-label", "alt", "placeholder", "title"]) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        const raw = el.getAttribute(attr) || "";
        const next = raw.replace(/\bgris\b/gi, "Greece");
        if (next !== raw) el.setAttribute(attr, next);
      }
    }
    document.documentElement.setAttribute("data-brand", "greece");
  }
  const observerOptions = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["disabled", "href"],
  };
  const observer = new MutationObserver(patch);
  function patch() {
    observer.disconnect();
    patchJobs();
    patchCrmLinks();
    linkLabels();
    patchPublicNavigation();
    enhancePublicPage();
    applySiteBranding();
    observer.observe(document.documentElement, observerOptions);
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
  observer.observe(document.documentElement, observerOptions);
  addEventListener("DOMContentLoaded", () => {
    if (repairBrokenHashPath()) return;
    patch();
    loadBusiness();
  });
  setTimeout(patch, 500);
})();
