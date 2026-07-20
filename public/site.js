(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const state = {
    lang: localStorage.getItem("gris-language") || "he",
    theme: localStorage.getItem("greece-theme") || "dark",
    business: {},
    jobs: [],
  };
  const copy = {
    he: {
      home: "ראשי", services: "שירותים", projects: "פרויקטים", process: "תהליך", about: "אודות", certifications: "תקנים", jobs: "משרות", contact: "צור קשר", crm: "כניסה למערכת", quote: "קבל הצעת מחיר", eyebrow: "דיוק תפעולי. אנשים מעולים.", heroA: "כוח אדם", heroB: "ותחזוקה", heroC: "ללא פשרות.", heroText: "פתרונות כוח אדם, תחזוקה, ניקיון ולוגיסטיקה לעסקים שלא יכולים להרשות לעצמם לעצור.", explore: "גלה את השירותים", years: "שנות ניסיון", workers: "עובדים פעילים", sites: "אתרים מנוהלים", response: "זמן תגובה", servicesTitle: "מעטפת תפעולית מלאה", servicesText: "צוותים מקצועיים, פיקוח רציף ומדידה ברורה — משלב האפיון ועד הביצוע היומיומי.", staffing: "כוח אדם מקצועי", staffingText: "גיוס, סינון, הכשרה וניהול עובדים בהתאמה מדויקת לאתר.", maintenance: "תחזוקה טכנית", maintenanceText: "תחזוקה מונעת ושוטפת למבנים, מערכות וציוד.", cleaning: "ניקיון תעשייתי", cleaningText: "צוותי ניקיון מנוהלים עם תהליכי איכות ובקרת ביצוע.", logistics: "לוגיסטיקה ותפעול", logisticsText: "מחסנים, ליקוט, אריזה ותמיכה תפעולית גמישה.", projectsTitle: "עבודה שרואים בתוצאות", calculatorTitle: "אומדן מהיר לפרויקט", calculatorText: "בחרו שירות, כמות עובדים ושעות כדי לקבל טווח תקציב ראשוני.", service: "סוג שירות", employeeCount: "מספר עובדים", hours: "שעות ביום", estimate: "אומדן חודשי", estimateNote: "אומדן ראשוני לפני אפיון מקצועי", requestExact: "קבל הצעה מדויקת", processTitle: "כך אנחנו עובדים", processText: "תהליך מסודר שמפחית סיכון ומייצר יציבות כבר מהיום הראשון.", faqTitle: "שאלות נפוצות", contactTitle: "בואו נבנה פתרון שמתאים לעסק שלכם", name: "שם מלא", company: "חברה", phone: "טלפון", email: "אימייל", message: "מה אתם צריכים?", send: "שליחת פנייה", sending: "שולח…", sent: "הפנייה נשלחה בהצלחה. נחזור אליכם בהקדם.", error: "לא הצלחנו לשלוח. נסו שוב או התקשרו אלינו.", openRole: "משרה פתוחה", apply: "הגשת מועמדות", noJobs: "אין כרגע משרות פתוחות.", applyTitle: "הגשת מועמדות", experience: "ניסיון והערות", submitApplication: "שליחת מועמדות", applicationSent: "המועמדות נשלחה בהצלחה.", footerText: "פתרונות כוח אדם ותחזוקה מדויקים לסביבות עבודה תובעניות.", rights: "כל הזכויות שמורות", pageAbout: "אנשים, תהליכים ותוצאות", pageAboutText: "אנחנו מחברים בין כוח אדם איכותי, ניהול שטח וטכנולוגיה כדי לאפשר לעסקים לעבוד בצורה יציבה ובטוחה.", pageProcess: "מתכנון לביצוע — בלי הפתעות", pageProcessText: "מתודולוגיה שקופה עם אחריות ברורה, מדדים ופיקוח רציף.", pageCerts: "איכות ובטיחות כחלק מהעבודה", pageCertsText: "תהליכי העבודה שלנו בנויים לפי עקרונות איכות, בטיחות, פרטיות ותיעוד.", pageJobs: "בואו לעבוד איתנו", pageJobsText: "משרות מקצועיות עם סביבת עבודה מסודרת, תנאים טובים ואפשרויות להתפתח.", menu: "פתיחת תפריט", theme: "החלפת ערכת צבעים", close: "סגירה" },
    en: {
      home: "Home", services: "Services", projects: "Projects", process: "Process", about: "About", certifications: "Standards", jobs: "Careers", contact: "Contact", crm: "Business login", quote: "Get a quote", eyebrow: "Operational precision. Exceptional people.", heroA: "Staffing", heroB: "and maintenance", heroC: "without compromise.", heroText: "Staffing, maintenance, cleaning and logistics for businesses that cannot afford to stop.", explore: "Explore services", years: "Years of experience", workers: "Active employees", sites: "Managed sites", response: "Response time", servicesTitle: "Complete operational coverage", servicesText: "Professional teams, continuous supervision and clear measurement—from planning to daily execution.", staffing: "Professional staffing", staffingText: "Recruitment, screening, training and workforce management tailored to every site.", maintenance: "Technical maintenance", maintenanceText: "Preventive and routine maintenance for facilities, systems and equipment.", cleaning: "Industrial cleaning", cleaningText: "Managed cleaning teams with quality processes and performance control.", logistics: "Logistics & operations", logisticsText: "Warehousing, picking, packing and flexible operational support.", projectsTitle: "Results you can see", calculatorTitle: "Quick project estimate", calculatorText: "Choose a service, team size and hours to receive an initial budget range.", service: "Service type", employeeCount: "Employees", hours: "Hours per day", estimate: "Monthly estimate", estimateNote: "Initial estimate before professional assessment", requestExact: "Get an exact quote", processTitle: "How we work", processText: "A structured process that reduces risk and creates stability from day one.", faqTitle: "Frequently asked questions", contactTitle: "Let’s build the right solution for your business", name: "Full name", company: "Company", phone: "Phone", email: "Email", message: "What do you need?", send: "Send request", sending: "Sending…", sent: "Your request was sent successfully. We will contact you shortly.", error: "We could not send the request. Please try again or call us.", openRole: "Open position", apply: "Apply now", noJobs: "There are no open positions right now.", applyTitle: "Job application", experience: "Experience and notes", submitApplication: "Submit application", applicationSent: "Your application was sent successfully.", footerText: "Precision staffing and maintenance for demanding work environments.", rights: "All rights reserved", pageAbout: "People, process and results", pageAboutText: "We combine great people, field management and technology so businesses can operate reliably and safely.", pageProcess: "From planning to execution—without surprises", pageProcessText: "A transparent methodology with clear ownership, metrics and continuous supervision.", pageCerts: "Quality and safety built into the work", pageCertsText: "Our operating methods are structured around quality, safety, privacy and documentation.", pageJobs: "Build your career with us", pageJobsText: "Professional roles, organized workplaces, good conditions and room to grow.", menu: "Open menu", theme: "Switch color theme", close: "Close" },
    ru: {
      home: "Главная", services: "Услуги", projects: "Проекты", process: "Процесс", about: "О нас", certifications: "Стандарты", jobs: "Вакансии", contact: "Контакты", crm: "Вход в систему", quote: "Получить расчёт", eyebrow: "Операционная точность. Отличные люди.", heroA: "Персонал", heroB: "и обслуживание", heroC: "без компромиссов.", heroText: "Персонал, обслуживание, уборка и логистика для бизнеса, который не может останавливаться.", explore: "Наши услуги", years: "Лет опыта", workers: "Активных сотрудников", sites: "Объектов", response: "Время ответа", servicesTitle: "Полное операционное решение", servicesText: "Профессиональные команды, постоянный контроль и понятные показатели.", staffing: "Профессиональный персонал", staffingText: "Подбор, проверка, обучение и управление сотрудниками под каждый объект.", maintenance: "Техническое обслуживание", maintenanceText: "Профилактическое и текущее обслуживание объектов и оборудования.", cleaning: "Промышленная уборка", cleaningText: "Управляемые команды с контролем качества.", logistics: "Логистика и операции", logisticsText: "Склады, комплектация, упаковка и гибкая поддержка.", projectsTitle: "Результаты нашей работы", calculatorTitle: "Быстрый расчёт", calculatorText: "Выберите услугу, количество сотрудников и часы для оценки бюджета.", service: "Тип услуги", employeeCount: "Сотрудники", hours: "Часов в день", estimate: "Оценка в месяц", estimateNote: "Предварительная оценка", requestExact: "Точное предложение", processTitle: "Как мы работаем", processText: "Системный процесс снижает риски и создаёт стабильность с первого дня.", faqTitle: "Частые вопросы", contactTitle: "Создадим решение для вашего бизнеса", name: "Имя", company: "Компания", phone: "Телефон", email: "Email", message: "Что вам требуется?", send: "Отправить", sending: "Отправка…", sent: "Запрос успешно отправлен. Мы скоро свяжемся с вами.", error: "Не удалось отправить. Попробуйте снова или позвоните нам.", openRole: "Открытая вакансия", apply: "Откликнуться", noJobs: "Сейчас нет открытых вакансий.", applyTitle: "Отклик на вакансию", experience: "Опыт и комментарии", submitApplication: "Отправить отклик", applicationSent: "Отклик успешно отправлен.", footerText: "Точный подбор персонала и обслуживание сложных рабочих сред.", rights: "Все права защищены", pageAbout: "Люди, процессы и результаты", pageAboutText: "Мы объединяем людей, управление и технологии для надёжной и безопасной работы бизнеса.", pageProcess: "От плана к выполнению — без сюрпризов", pageProcessText: "Прозрачная методология, понятная ответственность и постоянный контроль.", pageCerts: "Качество и безопасность в каждой задаче", pageCertsText: "Наши процессы основаны на качестве, безопасности, приватности и документации.", pageJobs: "Работайте с нами", pageJobsText: "Профессиональные вакансии, хорошие условия и возможности роста.", menu: "Открыть меню", theme: "Сменить тему", close: "Закрыть" },
  };
  const t = (key) => copy[state.lang][key] || copy.en[key] || key;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const serviceCards = () => [
    ["◎", t("staffing"), t("staffingText"), ["Recruitment", "Training", "On-site management"]],
    ["⌁", t("maintenance"), t("maintenanceText"), ["Preventive service", "Repairs", "Asset records"]],
    ["✦", t("cleaning"), t("cleaningText"), ["Industrial sites", "Quality control", "Managed teams"]],
    ["▦", t("logistics"), t("logisticsText"), ["Warehousing", "Fulfilment", "Flexible shifts"]],
  ];
  const navItems = () => [
    ["/", t("home")], ["/#services", t("services")], ["/#projects", t("projects")], ["/process", t("process")], ["/about", t("about")], ["/certifications", t("certifications")], ["/applications", t("jobs")], ["/contact", t("contact")],
  ];
  function header() {
    const path = location.pathname;
    return `<header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="Greece home"><span class="brand-mark">G</span><span>Greece</span></a><nav class="main-nav" aria-label="Primary navigation">${navItems().map(([href, label]) => `<a href="${href}" ${href === path ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav><div class="header-actions"><a class="phone-link" href="tel:${esc((state.business.phone || "").replace(/[^+\d]/g, ""))}">${esc(state.business.phone || "")}</a><div class="lang-switch" aria-label="Language">${["he", "en", "ru"].map((lang) => `<button type="button" data-language="${lang}" class="${state.lang === lang ? "active" : ""}" aria-pressed="${state.lang === lang}">${lang.toUpperCase()}</button>`).join("")}</div><button class="icon-button" type="button" data-action="theme" aria-label="${t("theme")}">${state.theme === "dark" ? "☀" : "◐"}</button><a class="button small secondary crm-login" href="/crm">${t("crm")}</a><a class="button small header-cta" href="/contact">${t("quote")}</a><button class="menu-button" type="button" data-action="menu" aria-label="${t("menu")}" aria-expanded="false">☰</button></div></div></header><nav class="mobile-drawer" id="mobile-menu" aria-label="Mobile navigation">${navItems().map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}<a class="button small" href="/crm">${t("crm")}</a></nav>`;
  }
  function footer() {
    const b = state.business;
    return `<footer class="site-footer"><div class="container"><div class="footer-grid"><div><a class="brand" href="/"><span class="brand-mark">G</span><span>Greece</span></a><p>${t("footerText")}</p></div><div><h3>${t("services")}</h3><div class="footer-links"><a href="/#services">${t("staffing")}</a><a href="/#services">${t("maintenance")}</a><a href="/#services">${t("cleaning")}</a><a href="/#services">${t("logistics")}</a></div></div><div><h3>${t("contact")}</h3><div class="footer-links"><a href="tel:${esc((b.phone || "").replace(/[^+\d]/g, ""))}">${esc(b.phone)}</a><a href="mailto:${esc(b.email)}">${esc(b.email)}</a><span>${esc(b.address)}</span><span>${esc(b.hours)}</span></div></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(b.company_name || "Greece")}. ${t("rights")}.</span><span>${esc(b.company_number ? `Company ${b.company_number}` : "")}</span></div></div></footer>`;
  }
  function servicesSection() {
    return `<section class="section" id="services"><div class="container"><div class="section-heading"><div><span class="eyebrow">Greece Services</span><h2>${t("servicesTitle")}</h2><p>${t("servicesText")}</p></div><a class="button secondary" href="/contact">${t("quote")}</a></div><div class="grid four">${serviceCards().map(([icon, title, text, list]) => `<article class="card"><span class="card-icon" aria-hidden="true">${icon}</span><h3>${title}</h3><p>${text}</p><ul class="card-list">${list.map((item) => `<li>${item}</li>`).join("")}</ul></article>`).join("")}</div></div></section>`;
  }
  function projectsSection() {
    const images = ["4a47b4dc2_generated_34019830.png", "761ee6316_generated_707301a8.png", "7b6044847_generated_02554b3e.png"];
    const projects = [["Industrial facility", "Managed technical maintenance and daily operational support."], ["Logistics center", "Flexible workforce and shift management for peak operations."], ["Commercial campus", "Integrated cleaning, maintenance and quality control."]];
    return `<section class="section alt" id="projects"><div class="container"><div class="section-heading"><div><span class="eyebrow">SELECTED OPERATIONS</span><h2>${t("projectsTitle")}</h2></div></div><div class="grid three">${projects.map((project, index) => `<article class="card project"><img src="https://media.base44.com/images/public/6a44dca7580bc27a93b13907/${images[index]}" alt="" loading="lazy" width="640" height="760" /><span class="tag">CASE ${String(index + 1).padStart(2, "0")}</span><h3>${project[0]}</h3><p>${project[1]}</p></article>`).join("")}</div></div></section>`;
  }
  function calculatorSection() {
    return `<section class="section" id="calculator"><div class="container"><div class="section-heading"><div><span class="eyebrow">SMART ESTIMATE</span><h2>${t("calculatorTitle")}</h2><p>${t("calculatorText")}</p></div></div><div class="calculator"><form class="form-card" id="estimate-form"><div class="field"><label for="estimate-service">${t("service")}</label><select id="estimate-service" name="service"><option value="48">${t("staffing")}</option><option value="62">${t("maintenance")}</option><option value="42">${t("cleaning")}</option><option value="52">${t("logistics")}</option></select></div><div class="field"><div class="range-row"><label for="estimate-workers">${t("employeeCount")}</label><output id="worker-output">4</output></div><input id="estimate-workers" name="workers" type="range" min="1" max="40" value="4" /></div><div class="field"><div class="range-row"><label for="estimate-hours">${t("hours")}</label><output id="hour-output">8</output></div><input id="estimate-hours" name="hours" type="range" min="1" max="24" value="8" /></div></form><div class="form-card estimate"><span>${t("estimate")}</span><strong id="estimate-total">₪35,942</strong><small>${t("estimateNote")}</small><a class="button" href="/contact">${t("requestExact")}</a></div></div></div></section>`;
  }
  function processSection() {
    const steps = [["Discovery", "Goals, site requirements, risk and service-level definition."], ["Planning", "Team structure, schedules, responsibilities and measurable KPIs."], ["Launch", "Recruitment, onboarding, equipment and supervised go-live."], ["Improve", "Ongoing reporting, quality checks and continuous optimization."]];
    return `<section class="section alt" id="process"><div class="container"><div class="section-heading"><div><span class="eyebrow">Greece Method</span><h2>${t("processTitle")}</h2><p>${t("processText")}</p></div></div><div class="timeline">${steps.map(([title, text]) => `<article class="timeline-item"><div><h3>${title}</h3><p>${text}</p></div></article>`).join("")}</div></div></section>`;
  }
  function faqSection() {
    const items = [["How fast can a team start?", "After assessment, standard teams can usually be mobilized within several business days. Complex projects receive a documented launch plan."], ["How is quality measured?", "We define site KPIs, inspection schedules, response targets and monthly reporting before launch."], ["Can the workforce scale seasonally?", "Yes. Staffing plans can include base capacity, peak shifts and backup personnel."], ["Do customers receive one point of contact?", "Every active account has a responsible manager and an escalation route."]];
    return `<section class="section" id="faq"><div class="container"><div class="section-heading"><div><span class="eyebrow">FAQ</span><h2>${t("faqTitle")}</h2></div></div><div class="faq">${items.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></div></section>`;
  }
  function contactForm() {
    return `<form class="form-card" id="contact-form"><div class="honeypot" aria-hidden="true"><label for="contact-website">Website</label><input id="contact-website" name="website" tabindex="-1" autocomplete="off" /></div><div class="form-grid"><div class="field"><label for="contact-name">${t("name")}</label><input id="contact-name" name="full_name" autocomplete="name" required minlength="2" maxlength="120" /></div><div class="field"><label for="contact-company">${t("company")}</label><input id="contact-company" name="company" autocomplete="organization" maxlength="160" /></div><div class="field"><label for="contact-phone">${t("phone")}</label><input id="contact-phone" name="phone" type="tel" autocomplete="tel" required minlength="7" maxlength="40" /></div><div class="field"><label for="contact-email">${t("email")}</label><input id="contact-email" name="email" type="email" autocomplete="email" maxlength="180" /></div><div class="field full"><label for="contact-service">${t("service")}</label><select id="contact-service" name="service_type"><option value="staffing">${t("staffing")}</option><option value="maintenance">${t("maintenance")}</option><option value="cleaning">${t("cleaning")}</option><option value="logistics">${t("logistics")}</option></select></div><div class="field full"><label for="contact-message">${t("message")}</label><textarea id="contact-message" name="message" rows="5" maxlength="2000"></textarea></div></div><button class="button" type="submit">${t("send")}</button><p class="form-status" id="contact-status" role="status" aria-live="polite"></p></form>`;
  }
  function contactSection() {
    const b = state.business;
    return `<section class="section alt" id="contact"><div class="container contact-layout"><div><span class="eyebrow">LET'S TALK</span><h2>${t("contactTitle")}</h2><div class="contact-list"><a href="tel:${esc((b.phone || "").replace(/[^+\d]/g, ""))}">☎ <span>${esc(b.phone)}</span></a><a href="mailto:${esc(b.email)}">✉ <span>${esc(b.email)}</span></a><span>⌖ ${esc(b.address)}</span><span>◷ ${esc(b.hours)}</span></div></div>${contactForm()}</div></section>`;
  }
  function jobsGrid() {
    return `<div class="grid three" id="jobs-grid">${state.jobs.length ? state.jobs.map((job) => `<article class="card job-card"><span class="tag">${t("openRole")}</span><h3>${esc(job.title)}</h3><p>${esc(job.location)} · ${esc(job.employment_type || "")}</p><p>${esc(job.description || "")}</p><strong>${esc(job.salary_range || "")}</strong><button class="button small" type="button" data-apply-job="${esc(job.id)}">${t("apply")}</button></article>`).join("") : `<div class="card"><p>${t("noJobs")}</p></div>`}</div>`;
  }
  function homePage() {
    return `<main id="main-content"><section class="hero" id="hero"><div class="container hero-content"><span class="eyebrow">${t("eyebrow")}</span><h1>${t("heroA")} <span>${t("heroB")}</span><br />${t("heroC")}</h1><p class="lead">${t("heroText")}</p><div class="hero-actions"><a class="button" href="/contact">${t("quote")}</a><a class="button secondary" href="#services">${t("explore")}</a></div><div class="hero-proof"><div><strong>18+</strong>${t("years")}</div><div><strong>240+</strong>${t("workers")}</div><div><strong>36</strong>${t("sites")}</div><div><strong>&lt;4h</strong>${t("response")}</div></div></div></section><section class="section"><div class="container"><div class="metrics"><div class="metric"><strong>98.4%</strong><span>Service continuity</span></div><div class="metric"><strong>4.8/5</strong><span>Customer rating</span></div><div class="metric"><strong>24/7</strong><span>Operational coverage</span></div><div class="metric"><strong>100%</strong><span>Documented delivery</span></div></div></div></section>${servicesSection()}${projectsSection()}${calculatorSection()}${processSection()}<section class="section" id="jobs"><div class="container"><div class="section-heading"><div><span class="eyebrow">Join Greece</span><h2>${t("pageJobs")}</h2><p>${t("pageJobsText")}</p></div><a class="button secondary" href="/applications">${t("jobs")}</a></div>${jobsGrid()}</div></section>${faqSection()}${contactSection()}</main>`;
  }
  function pageHero(title, text, label) { return `<section class="page-hero"><div class="container"><span class="eyebrow">${label}</span><h1>${title}</h1><p>${text}</p></div></section>`; }
  function aboutPage() {
    return `<main id="main-content">${pageHero(t("pageAbout"), t("pageAboutText"), "ABOUT GREECE")}<section class="section"><div class="container rich-copy"><h2>Built for demanding operations</h2><p>Greece was created to solve the gap between hiring people and managing a dependable operation. We build teams, operating standards and reporting around each customer's real environment.</p><h2>One accountable operating partner</h2><p>Customers receive one management layer across staffing, maintenance, cleaning and logistics. That creates better communication, faster decisions and clearer responsibility.</p><h2>Technology with a human operating model</h2><p>Our platform connects customers, employees, schedules, documents, service activity and finance without replacing the field leadership that makes delivery work.</p></div></section>${contactSection()}</main>`;
  }
  function processPage() { return `<main id="main-content">${pageHero(t("pageProcess"), t("pageProcessText"), "THE GREECE METHOD")}${processSection()}${contactSection()}</main>`; }
  function certificationsPage() {
    const certs = [["ISO 9001 ALIGNED", "Quality management", "Documented controls, corrective action and continuous improvement."], ["ISO 45001 ALIGNED", "Occupational safety", "Risk assessment, incident prevention and safe operating procedures."], ["ISO 27001 READY", "Information security", "Access control, audit history, secure files and operational monitoring."], ["WCAG 2.2 TARGET", "Digital accessibility", "Keyboard access, readable contrast, labels and reduced-motion support."], ["PRIVACY", "Data minimization", "Role-based access and auditable handling of customer and employee data."], ["SERVICE SLA", "Measurable delivery", "Defined response targets, inspections and customer reporting."]];
    return `<main id="main-content">${pageHero(t("pageCerts"), t("pageCertsText"), "STANDARDS & CONTROL")}<section class="section"><div class="container cert-grid">${certs.map(([code, title, text]) => `<article class="card cert"><span class="cert-code">${code}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join("")}</div></section>${contactSection()}</main>`;
  }
  function jobsPage() { return `<main id="main-content">${pageHero(t("pageJobs"), t("pageJobsText"), "CAREERS")}<section class="section"><div class="container">${jobsGrid()}</div></section></main>`; }
  function contactPage() { return `<main id="main-content">${pageHero(t("contactTitle"), t("heroText"), "CONTACT GREECE")}${contactSection()}</main>`; }
  function notFoundPage() { return `<main id="main-content">${pageHero("404", "The requested page does not exist.", "NOT FOUND")}<section class="section"><div class="container"><a class="button" href="/">${t("home")}</a></div></section></main>`; }
  function currentPage() {
    return ({ "/": homePage, "/about": aboutPage, "/process": processPage, "/certifications": certificationsPage, "/applications": jobsPage, "/contact": contactPage })[location.pathname]?.() || notFoundPage();
  }
  function render() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "he" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = state.theme;
    const routeTitles = { "/": "Greece", "/about": t("about"), "/process": t("process"), "/certifications": t("certifications"), "/applications": t("jobs"), "/contact": t("contact") };
    document.title = `${routeTitles[location.pathname] || "404"} | Greece`;
    $("#site").innerHTML = `${header()}${currentPage()}${footer()}`;
    $("#site").setAttribute("aria-busy", "false");
    bindPageFeatures();
  }
  function bindPageFeatures() {
    $("#estimate-form")?.addEventListener("input", updateEstimate);
    $("#contact-form")?.addEventListener("submit", submitLead);
    updateEstimate();
  }
  function updateEstimate() {
    const form = $("#estimate-form");
    if (!form) return;
    const workers = Number(form.workers.value), hours = Number(form.hours.value), rate = Number(form.service.value), monthly = workers * hours * rate * 22 * 1.17;
    $("#worker-output").value = workers;
    $("#hour-output").value = hours;
    $("#estimate-total").textContent = new Intl.NumberFormat(state.lang, { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(monthly);
  }
  async function submitLead(event) {
    event.preventDefault();
    const form = event.currentTarget, status = $("#contact-status"), button = form.querySelector('button[type="submit"]'), payload = Object.fromEntries(new FormData(form));
    button.disabled = true; button.textContent = t("sending"); status.textContent = ""; status.className = "form-status";
    try {
      const response = await fetch("/api/v1/public/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Request failed");
      form.reset(); status.textContent = t("sent"); status.classList.add("success");
    } catch { status.textContent = t("error"); status.classList.add("error"); }
    finally { button.disabled = false; button.textContent = t("send"); }
  }
  function openApplication(jobId) {
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `<form class="modal" id="application-form"><div class="modal-head"><div><span class="eyebrow">${t("applyTitle")}</span><h2>${esc(job.title)}</h2></div><button class="modal-close" type="button" data-action="close-modal" aria-label="${t("close")}">×</button></div><input type="hidden" name="job_id" value="${esc(job.id)}" /><input type="hidden" name="job_title" value="${esc(job.title)}" /><div class="honeypot" aria-hidden="true"><label for="application-website">Website</label><input id="application-website" name="website" tabindex="-1" autocomplete="off" /></div><div class="form-grid"><div class="field"><label for="application-name">${t("name")}</label><input id="application-name" name="full_name" required minlength="2" maxlength="120" /></div><div class="field"><label for="application-phone">${t("phone")}</label><input id="application-phone" name="phone" type="tel" required minlength="7" maxlength="40" /></div><div class="field full"><label for="application-email">${t("email")}</label><input id="application-email" name="email" type="email" maxlength="180" /></div><div class="field full"><label for="application-experience">${t("experience")}</label><textarea id="application-experience" name="experience" rows="5" maxlength="2500"></textarea></div></div><button class="button" type="submit">${t("submitApplication")}</button><p class="form-status" role="status" aria-live="polite"></p></form>`;
    document.body.append(backdrop);
    $("#application-name", backdrop).focus();
    $("#application-form", backdrop).addEventListener("submit", submitApplication);
  }
  async function submitApplication(event) {
    event.preventDefault();
    const form = event.currentTarget, status = $(".form-status", form), button = form.querySelector('button[type="submit"]'), payload = Object.fromEntries(new FormData(form));
    button.disabled = true; button.textContent = t("sending");
    try {
      const response = await fetch("/api/v1/public/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Request failed");
      form.reset(); status.textContent = t("applicationSent"); status.className = "form-status success"; button.hidden = true;
    } catch { status.textContent = t("error"); status.className = "form-status error"; button.disabled = false; button.textContent = t("submitApplication"); }
  }
  document.addEventListener("click", (event) => {
    const language = event.target.closest("[data-language]")?.dataset.language;
    if (language) { state.lang = language; localStorage.setItem("gris-language", language); render(); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "theme") { state.theme = state.theme === "dark" ? "light" : "dark"; localStorage.setItem("greece-theme", state.theme); render(); return; }
    if (action === "menu") { const menu = $("#mobile-menu"), open = menu.classList.toggle("open"); event.target.closest("button").setAttribute("aria-expanded", String(open)); return; }
    if (action === "close-modal") { event.target.closest(".modal-backdrop")?.remove(); return; }
    if (event.target.classList.contains("modal-backdrop")) event.target.remove();
    const jobId = event.target.closest("[data-apply-job]")?.dataset.applyJob;
    if (jobId) openApplication(jobId);
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") $(".modal-backdrop")?.remove(); });
  function observeWebVitals() {
    if (!("PerformanceObserver" in window)) return;
    const sessionId = sessionStorage.getItem("gris-rum-session") || (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    sessionStorage.setItem("gris-rum-session", sessionId);
    const sent = new Set();
    const thresholds = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800] };
    const report = (metric, value) => {
      const key = `${metric}:${Math.round(value)}`;
      if (sent.has(key)) return;
      sent.add(key);
      const limits = thresholds[metric], rating = value <= limits[0] ? "good" : value <= limits[1] ? "needs-improvement" : "poor";
      const payload = JSON.stringify({ metric, value, rating, route: location.pathname, session_id: sessionId });
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/v1/public/web-vitals", blob)) fetch("/api/v1/public/web-vitals", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    };
    try {
      new PerformanceObserver((list) => { const entry = list.getEntries().at(-1); if (entry) report("LCP", entry.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
      let cls = 0, inp = 0;
      new PerformanceObserver((list) => list.getEntries().filter((entry) => !entry.hadRecentInput).forEach((entry) => { cls += entry.value; })).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => { inp = Math.max(inp, entry.duration || 0); })).observe({ type: "event", buffered: true, durationThreshold: 40 });
      addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { report("CLS", cls); if (inp) report("INP", inp); } });
      const navigation = performance.getEntriesByType("navigation")[0], paint = performance.getEntriesByName("first-contentful-paint")[0];
      if (navigation) report("TTFB", navigation.responseStart);
      if (paint) report("FCP", paint.startTime);
    } catch {}
  }
  async function init() {
    const legacyRoutes = { "#about": "/about", "#contact": "/contact", "#process": "/process", "#certifications": "/certifications", "#jobs": "/applications", "#services": "/#services" };
    if (location.pathname !== "/" && legacyRoutes[location.hash]) history.replaceState({}, "", legacyRoutes[location.hash]);
    try {
      const [businessResponse, jobsResponse] = await Promise.all([fetch("/api/v1/public/business"), fetch("/api/v1/public/jobs")]);
      if (businessResponse.ok) state.business = await businessResponse.json();
      if (jobsResponse.ok) state.jobs = await jobsResponse.json();
    } catch {}
    render();
    observeWebVitals();
    if (location.hash) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  init();
})();
