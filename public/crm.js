// @ts-nocheck - not yet type-annotated; DOM lookups and FormData handling
// need narrower types than plain Element/FormDataEntryValue. Revisit in a future milestone.
const $ = (s, p = document) => p.querySelector(s),
  $$ = (s, p = document) => [...p.querySelectorAll(s)];
const API = "/api/v1";
let token = localStorage.accessToken || "",
  user = null,
  current = "dashboard",
  page = 1,
  search = "",
  cache = {},
  notificationController = null,
  businessSettingsCache = {},
  lang = localStorage.lang || "en";
const modules = {
  dashboard: { label: "Dashboard", icon: "⌂", group: "Overview" },
  customers: {
    label: "Customers",
    icon: "◉",
    group: "CRM",
    fields: [
      "company_name",
      "contact_name",
      "email",
      "phone",
      "status",
      "address",
      "tags",
      "notes",
    ],
  },
  leads: {
    label: "Leads",
    icon: "◎",
    group: "CRM",
    fields: [
      "full_name",
      "company",
      "email",
      "phone",
      "source",
      "score",
      "stage",
      "follow_up_at",
    ],
  },
  deals: {
    label: "Deals",
    icon: "◇",
    group: "CRM",
    pipeline: true,
    fields: [
      "title",
      "value",
      "stage",
      "probability",
      "expected_close",
      "notes",
    ],
  },
  communications: {
    label: "Communications",
    icon: "✉",
    group: "CRM",
    fields: ["type", "subject", "content", "occurred_at"],
  },
  activities: {
    label: "Activity Timeline",
    icon: "◴",
    group: "CRM",
    fields: [
      "entity_type",
      "entity_id",
      "activity_type",
      "title",
      "description",
      "occurred_at",
    ],
    readOnly: true,
  },
  tasks: {
    label: "Tasks",
    icon: "✓",
    group: "Work",
    fields: [
      "title",
      "priority",
      "status",
      "due_date",
      "progress",
      "description",
    ],
  },
  projects: {
    label: "Projects",
    icon: "▦",
    group: "Work",
    fields: [
      "name",
      "status",
      "start_date",
      "deadline",
      "progress",
      "budget",
      "spent",
      "description",
    ],
  },
  calendar_events: {
    label: "Calendar",
    icon: "▣",
    group: "Work",
    special: "calendar",
    fields: [
      "title",
      "event_type",
      "start_at",
      "end_at",
      "location",
      "status",
      "description",
    ],
  },
  automation_rules: {
    label: "Automations",
    icon: "⌁",
    group: "Work",
    special: "automations",
    fields: [
      "name",
      "entity_type",
      "trigger_event",
      "conditions",
      "actions",
      "active",
    ],
  },
  approval_requests: {
    label: "Approvals",
    icon: "✓",
    group: "Work",
    special: "approvals",
    fields: [
      "entity_type",
      "action",
      "assigned_role",
      "status",
      "amount",
      "reason",
      "created_at",
    ],
  },
  employees: {
    label: "Employees",
    icon: "♙",
    group: "People",
    fields: [
      "employee_number",
      "full_name",
      "email",
      "phone",
      "position",
      "salary",
      "status",
      "hire_date",
    ],
  },
  attendance: {
    label: "Attendance",
    icon: "◷",
    group: "People",
    fields: ["employee_id", "date", "check_in", "check_out", "status", "notes"],
  },
  leave_requests: {
    label: "Leave Requests",
    icon: "◫",
    group: "People",
    fields: [
      "employee_id",
      "leave_type",
      "start_date",
      "end_date",
      "days",
      "status",
      "reason",
    ],
  },
  payroll: {
    label: "Payroll",
    icon: "◫",
    group: "People",
    fields: [
      "employee_id",
      "month",
      "base_salary",
      "bonuses",
      "deductions",
      "tax",
      "net_salary",
      "status",
    ],
  },
  portal: {
    label: "Employee Portal",
    icon: "♧",
    group: "People",
    special: "portal",
  },
  transactions: {
    label: "Transactions",
    icon: "↔",
    group: "Finance",
    fields: ["type", "category", "amount", "date", "description", "vat_rate"],
  },
  quotes: {
    label: "Quotes",
    icon: "▧",
    group: "Finance",
    fields: [
      "number",
      "title",
      "customer_id",
      "valid_until",
      "status",
      "total",
      "subtotal",
      "vat_rate",
      "vat_amount",
      "notes",
    ],
  },
  invoices: {
    label: "Invoices",
    icon: "▤",
    group: "Finance",
    fields: [
      "number",
      "customer_id",
      "issue_date",
      "due_date",
      "status",
      "total",
      "subtotal",
      "vat_rate",
      "vat_amount",
      "notes",
    ],
  },
  bank_accounts: {
    label: "Bank Accounts",
    icon: "▰",
    group: "Finance",
    fields: ["name", "bank", "account_number", "balance", "currency"],
  },
  reports: {
    label: "Reports & Exports",
    icon: "▥",
    group: "Finance",
    special: "reports",
  },
  job_listings: {
    label: "Job Listings",
    icon: "⚑",
    group: "Recruiting",
    fields: [
      "title",
      "location",
      "category",
      "employment_type",
      "salary_range",
      "status",
      "description",
      "requirements",
    ],
  },
  job_applications: {
    label: "Applications",
    icon: "◌",
    group: "Recruiting",
    fields: [
      "job_title",
      "full_name",
      "email",
      "phone",
      "status",
      "experience",
    ],
  },
  documents: {
    label: "Secure Files",
    icon: "□",
    group: "System",
    fields: ["name", "mime_type", "entity_type", "entity_id", "access_role"],
  },
  notifications: {
    label: "Notifications",
    icon: "♢",
    group: "System",
    fields: ["type", "title", "message", "link", "read_at"],
    readOnly: true,
  },
  integrations: {
    label: "Integrations",
    icon: "⌘",
    group: "System",
    special: "integrations",
  },
  security: {
    label: "Security Center",
    icon: "◈",
    group: "System",
    special: "security",
  },
  analytics: {
    label: "Website Analytics",
    icon: "⬆",
    group: "System",
    special: "analytics",
  },
  monitoring: {
    label: "Monitoring",
    icon: "◉",
    group: "System",
    special: "monitoring",
  },
  backups: { label: "Backups", icon: "↻", group: "System", special: "backups" },
  settings: {
    label: "Business Settings",
    icon: "⚙",
    group: "System",
    special: "settings",
  },
  audit_logs: {
    label: "Audit Log",
    icon: "◈",
    group: "System",
    readOnly: true,
  },
  users: {
    label: "Users & Roles",
    icon: "⚙",
    group: "System",
    fields: ["name", "email", "role_id", "verified"],
    readOnly: true,
  },
};
const WORD_HE = {
  dashboard: "לוח בקרה",
  overview: "סקירה כללית",
  customers: "לקוחות",
  crm: "ניהול קשרי לקוחות",
  leads: "לידים",
  deals: "עסקאות",
  communications: "תקשורת",
  "activity timeline": "ציר פעילות",
  tasks: "משימות",
  work: "עבודה",
  projects: "פרויקטים",
  calendar: "יומן",
  automations: "אוטומציות",
  approvals: "אישורים",
  employees: "עובדים",
  people: "אנשים",
  attendance: "נוכחות",
  "leave requests": "בקשות חופשה",
  payroll: "שכר",
  "employee portal": "פורטל עובדים",
  transactions: "תנועות כספיות",
  finance: "כספים",
  invoices: "חשבוניות",
  quotes: "הצעות מחיר",
  valid_until: "בתוקף עד",
  expired: "פג תוקף",
  converted: "הומר לחשבונית",
  "bank accounts": "חשבונות בנק",
  "reports & exports": "דוחות וייצוא",
  "job listings": "משרות פנויות",
  recruiting: "גיוס",
  applications: "מועמדויות",
  home: "דף הבית",
  about: "אודות",
  contact: "צור קשר",
  process: "תהליך העבודה",
  certifications: "הסמכות",
  "website analytics": "אנליטיקס לאתר",
  "secure files": "קבצים מאובטחים",
  documents: "מסמכים",
  system: "מערכת",
  database: "מסד נתונים",
  notifications: "התראות",
  integrations: "אינטגרציות",
  "security center": "מרכז אבטחה",
  monitoring: "ניטור",
  backups: "גיבויים",
  "business settings": "הגדרות עסק",
  "audit log": "יומן ביקורת",
  "users & roles": "משתמשים והרשאות",
  company_name: "שם החברה",
  contact_name: "איש קשר",
  email: "אימייל",
  phone: "טלפון",
  status: "סטטוס",
  address: "כתובת",
  tags: "תגיות",
  notes: "הערות",
  full_name: "שם מלא",
  company: "חברה",
  source: "מקור",
  score: "ניקוד",
  stage: "שלב",
  follow_up_at: "תזכורת מעקב",
  title: "כותרת",
  value: "ערך",
  probability: "הסתברות",
  expected_close: "סגירה צפויה",
  type: "סוג",
  subject: "נושא",
  content: "תוכן",
  occurred_at: "תאריך",
  entity_type: "סוג ישות",
  entity_id: "מזהה ישות",
  activity_type: "סוג פעילות",
  description: "תיאור",
  priority: "עדיפות",
  due_date: "תאריך יעד",
  progress: "התקדמות",
  name: "שם",
  start_date: "תאריך התחלה",
  deadline: "מועד סופי",
  budget: "תקציב",
  spent: "הוצא",
  event_type: "סוג אירוע",
  start_at: "התחלה",
  end_at: "סיום",
  location: "מיקום",
  trigger_event: "אירוע מפעיל",
  conditions: "תנאים",
  actions: "פעולות",
  active: "פעיל",
  assigned_role: "תפקיד מוקצה",
  amount: "סכום",
  reason: "סיבה",
  created_at: "נוצר בתאריך",
  employee_number: "מספר עובד",
  position: "תפקיד",
  salary: "שכר",
  hire_date: "תאריך קליטה",
  employee_id: "עובד",
  date: "תאריך",
  check_in: "כניסה",
  check_out: "יציאה",
  leave_type: "סוג חופשה",
  end_date: "תאריך סיום",
  days: "ימים",
  month: "חודש",
  base_salary: "שכר בסיס",
  bonuses: "בונוסים",
  deductions: "ניכויים",
  tax: "מס",
  net_salary: "שכר נטו",
  category: "קטגוריה",
  vat_rate: "אחוז מע\"מ",
  number: "מספר",
  customer_id: "לקוח",
  issue_date: "תאריך הפקה",
  total: "סה\"כ",
  subtotal: "סכום ביניים",
  vat_amount: "סכום מע\"מ",
  bank: "בנק",
  account_number: "מספר חשבון",
  balance: "יתרה",
  currency: "מטבע",
  employment_type: "סוג העסקה",
  salary_range: "טווח שכר",
  requirements: "דרישות",
  experience: "ניסיון",
  job_title: "תפקיד המשרה",
  mime_type: "סוג קובץ",
  access_role: "הרשאת גישה",
  message: "הודעה",
  link: "קישור",
  read_at: "נקרא בתאריך",
  role_id: "תפקיד",
  verified: "מאומת",
  performance_notes: "הערות ביצועים",
  inactive: "לא פעיל",
  todo: "לביצוע",
  in_progress: "בתהליך",
  done: "הושלם",
  planning: "בתכנון",
  on_hold: "בהמתנה",
  completed: "הושלם",
  cancelled: "בוטל",
  scheduled: "מתוזמן",
  pending: "ממתין",
  approved: "אושר",
  rejected: "נדחה",
  on_leave: "בחופשה",
  terminated: "הופסק",
  present: "נוכח",
  absent: "נעדר",
  late: "איחור",
  draft: "טיוטה",
  processed: "עובד",
  paid: "שולם",
  sent: "נשלח",
  overdue: "באיחור",
  closed: "סגור",
  reviewing: "בבדיקה",
  interviewed: "רואיין",
  hired: "התקבל",
  income: "הכנסה",
  expense: "הוצאה",
  meeting: "פגישה",
  note: "הערה",
  new: "חדש",
  qualified: "מתאים",
  qualification: "כשירות",
  proposal: "הצעה",
  negotiation: "משא ומתן",
  won: "נסגר בהצלחה",
  lost: "אבד",
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
  urgent: "דחוף",
  reminder: "תזכורת",
  shift: "משמרת",
  inspection: "ביקורת",
  vacation: "חופשה",
  sick: "מחלה",
  personal: "אישי",
  unpaid: "ללא תשלום",
  website: "אתר אינטרנט",
  referral: "הפניה",
  campaign: "קמפיין",
  organic: "אורגני",
  partner: "שותף",
  full_time: "משרה מלאה",
  part_time: "משרה חלקית",
  temporary: "זמני",
  contract: "קבלני",
  customer: "לקוח",
  project: "פרויקט",
  employee: "עובד",
  transaction: "תנועה כספית",
  manager: "מנהל",
  administrator: "מנהל מערכת",
  sandbox: "סביבת בדיקה",
  live: "פעיל",
  connected: "מחובר",
  disconnected: "מנותק",
  healthy: "תקין",
  degraded: "פגום",
  down: "מושבת",
  queued: "בתור",
  failed: "נכשל",
};
const PHRASE_HE = {
  "Open menu": "פתח תפריט",
  "Search business records": "חפש רשומות עסקיות",
  "Search customers, people, projects, invoices… (Ctrl/Cmd+K)":
    "חפש לקוחות, אנשים, פרויקטים, חשבוניות… (Ctrl/Cmd+K)",
  "Back to website": "חזרה לאתר",
  "Switch color theme": "החלף ערכת נושא",
  "Switch language": "החלף שפה",
  Notifications: "התראות",
  "Open notifications": "פתח התראות",
  Logout: "התנתקות",
  "Log out": "התנתקות",
  "One platform.": "פלטפורמה אחת.",
  "Total business clarity.": "בהירות עסקית מלאה.",
  "Customers, sales, finance, people and projects—securely connected in one operating system.":
    "לקוחות, מכירות, כספים, אנשים ופרויקטים — מחוברים בבטחה למערכת הפעלה אחת.",
  "Secure workspace": "סביבת עבודה מאובטחת",
  "Welcome back": "ברוכים השבים",
  "Sign in to Greece Business Platform": "התחברו לפלטפורמה העסקית של Greece",
  Email: "אימייל",
  Password: "סיסמה",
  "Remember this device": "זכור מכשיר זה",
  "Sign in securely": "התחברות מאובטחת",
  "Sign in with a passkey": "התחברות עם מפתח גישה",
  "Forgot password": "שכחתי סיסמה",
  "Enter your two-factor code": "הזן את קוד האימות הדו-שלבי",
  "Account email": "אימייל החשבון",
  "Development reset token created": "נוצר טוקן איפוס לסביבת פיתוח",
  "If the account exists, reset instructions were sent":
    "אם החשבון קיים, נשלחו הוראות איפוס",
  "Choose a new password": "בחר סיסמה חדשה",
  "At least 10 characters, with a letter and a number.":
    "לפחות 10 תווים, עם אות וספרה.",
  "Password updated. You can now sign in.": "הסיסמה עודכנה. כעת ניתן להתחבר.",
  "Activate your account": "הפעל את החשבון שלך",
  "Choose a password to finish setting up your account. At least 10 characters, with a letter and a number.":
    "בחר סיסמה כדי לסיים את הגדרת החשבון. לפחות 10 תווים, עם אות וספרה.",
  "Account activated. You can now sign in.": "החשבון הופעל. כעת ניתן להתחבר.",
  "Loading executive dashboard…": "טוען לוח בקרה ניהולי…",
  "Executive overview": "סקירה ניהולית",
  "Here is what is happening across your business today.":
    "כך נראה העסק שלך היום.",
  "New task": "משימה חדשה",
  "Email delivery requires configuration": "יש להגדיר את שליחת האימיילים",
  "Contact forms are saved in CRM, but SMTP must be connected before messages can reach":
    "טפסי יצירת קשר נשמרים במערכת, אך יש לחבר SMTP כדי שהודעות יגיעו אל",
  "Two-factor authentication is not enabled": "אימות דו-שלבי אינו מופעל",
  "Your account has administrator access.": "לחשבון שלך יש הרשאות מנהל מערכת.",
  "Enable 2FA now": "הפעל אימות דו-שלבי כעת",
  Revenue: "הכנסות",
  Expenses: "הוצאות",
  "Current period": "התקופה הנוכחית",
  "Net profit": "רווח נקי",
  "Healthy margin": "מרווח בריא",
  Outstanding: "יתרת חוב",
  "Invoices due": "חשבוניות לתשלום",
  "Active customers": "לקוחות פעילים",
  "Customer base": "בסיס לקוחות",
  "Active projects": "פרויקטים פעילים",
  "In delivery": "בביצוע",
  Employees: "עובדים",
  "Active team": "צוות פעיל",
  "Due today": "יעד היום",
  "Tasks requiring action": "משימות הדורשות טיפול",
  "Cash flow": "תזרים מזומנים",
  "Income vs expenses": "הכנסות מול הוצאות",
  "Last 12 months": "12 החודשים האחרונים",
  "Priority tasks": "משימות בעדיפות",
  "View all": "הצג הכל",
  Due: "יעד",
  "No open tasks": "אין משימות פתוחות",
  "Sales pipeline": "צינור מכירות",
  "Open pipeline": "פתח צינור מכירות",
  "Notification center": "מרכז התראות",
  "You are all caught up": "הכל מעודכן",
  "Loading data…": "טוען נתונים…",
  "Select all": "בחר הכל",
  "records · centrally managed and audited": "רשומות · מנוהלות ומבוקרות באופן מרכזי",
  "Invite user": "הזמן משתמש",
  Add: "הוסף",
  Search: "חיפוש",
  Filter: "סינון",
  "Export CSV": "ייצוא CSV",
  "Export Excel": "ייצוא Excel",
  "Select row": "בחר שורה",
  Actions: "פעולות",
  No: "אין",
  "found.": "שנמצאו.",
  Page: "עמוד",
  of: "מתוך",
  Previous: "הקודם",
  Next: "הבא",
  selected: "נבחרו",
  "Set status…": "קבע סטטוס…",
  Apply: "החל",
  "Delete selected": "מחק את הנבחרים",
  PDF: "PDF",
  Download: "הורדה",
  "Mark read": "סמן כנקרא",
  Approve: "אשר",
  Reject: "דחה",
  Edit: "עריכה",
  Delete: "מחיקה",
  Update: "עדכון",
  Create: "יצירה",
  New: "חדש",
  Close: "סגירה",
  Cancel: "ביטול",
  "Save changes": "שמור שינויים",
  "Create record": "צור רשומה",
  "Enter a phone number or email so you have a way to reach them":
    "הזן מספר טלפון או אימייל כדי שיהיה אפשר ליצור קשר",
  "Record updated": "הרשומה עודכנה",
  "Record created": "הרשומה נוצרה",
  Select: "בחר",
  "Active rule": "כלל פעיל",
  Tags: "תגיות",
  "vip, contract, referral": "וי-איי-פי, חוזה, הפניה",
  "Comma-separated": "מופרד בפסיקים",
  "Loading…": "טוען…",
  Submit: "שלח",
  "New password": "סיסמה חדשה",
  "Repeat password": "חזור על הסיסמה",
  "Set password": "קבע סיסמה",
  "Passwords do not match": "הסיסמאות אינן תואמות",
  "Invite a new user": "הזמן משתמש חדש",
  "Full name": "שם מלא",
  Role: "תפקיד",
  "Send invite": "שלח הזמנה",
  "Invite sent": "ההזמנה נשלחה",
  "Delete this record? This action is logged.": "למחוק את הרשומה? פעולה זו מתועדת.",
  "Record deleted": "הרשומה נמחקה",
  "Secure storage": "אחסון מאובטח",
  "Upload a file": "העלה קובץ",
  "File (PDF, image, text, CSV or XLSX; max 10 MB)":
    "קובץ (PDF, תמונה, טקסט, CSV או XLSX; עד 10MB)",
  "Related record type": "סוג רשומה קשורה",
  General: "כללי",
  "Related record ID": "מזהה רשומה קשורה",
  "Minimum access role": "הרשאת גישה מינימלית",
  "Upload securely": "העלה בבטחה",
  "Uploading…": "מעלה…",
  "File uploaded": "הקובץ הועלה",
  "Loading sales pipeline…": "טוען צינור מכירות…",
  "Track value, probability and expected close across every opportunity.":
    "עקוב אחר ערך, הסתברות ומועד סגירה צפוי בכל הזדמנות.",
  "New deal": "עסקה חדשה",
  "Search deals…": "חיפוש עסקאות…",
  "not set": "לא נקבע",
  "Loading customer workspace…": "טוען סביבת עבודה של לקוח…",
  Contact: "איש קשר",
  WhatsApp: "וואטסאפ",
  Pipeline: "צינור מכירות",
  Projects: "פרויקטים",
  Invoices: "חשבוניות",
  "Open tasks": "משימות פתוחות",
  Contacts: "אנשי קשר",
  Primary: "ראשי",
  "No additional contacts yet.": "אין עדיין אנשי קשר נוספים.",
  "Recent activity": "פעילות אחרונה",
  "Activity will appear here.": "פעילות תופיע כאן.",
  "Loading employee workspace…": "טוען סביבת עבודה של עובד…",
  Employment: "העסקה",
  "Vacation balance": "יתרת חופשה",
  days: "ימים",
  "Sick balance": "יתרת מחלה",
  "Recent attendance": "נוכחות אחרונה",
  "No attendance records yet.": "אין עדיין רשומות נוכחות.",
  "No leave requests yet.": "אין עדיין בקשות חופשה.",
  "Payroll history": "היסטוריית שכר",
  "Assigned tasks": "משימות שהוקצו",
  "No records yet.": "אין עדיין רשומות.",
  "Add contact": "הוסף איש קשר",
  "Contact name": "שם איש הקשר",
  "Email (optional)": "אימייל (אופציונלי)",
  "Phone (optional)": "טלפון (אופציונלי)",
  "Contact added": "איש הקשר נוסף",
  "Sandbox WhatsApp message": "הודעת וואטסאפ (סביבת בדיקה)",
  Message: "הודעה",
  "Hello, this is GREECE Maintenance & Staffing regarding your account.":
    "שלום, זוהי GREECE אחזקה וכוח אדם בנוגע לחשבונך.",
  Send: "שלח",
  "WhatsApp sandbox job": "משימת וואטסאפ (סביבת בדיקה)",
  "Sending invoice…": "שולח חשבונית…",
  "Invoice emailed to customer": "החשבונית נשלחה ללקוח באימייל",
  "Leave request": "בקשת חופשה",
  "Skip tour": "דלג על הסיור",
  "Your dashboard": "לוח הבקרה שלך",
  "See revenue, tasks, and pipeline at a glance the moment you sign in.":
    "ראה הכנסות, משימות וצינור מכירות במבט אחד ברגע ההתחברות.",
  "Search anything": "חפש כל דבר",
  "Press Ctrl+K (or Cmd+K on Mac) anytime to jump straight to customers, invoices, or projects.":
    "לחץ Ctrl+K (או Cmd+K ב-Mac) בכל עת כדי לדלג ישירות ללקוחות, חשבוניות או פרויקטים.",
  "Stay notified": "הישאר מעודכן",
  "New leads and approvals show up here in real time — no refresh needed.":
    "לידים ואישורים חדשים מופיעים כאן בזמן אמת — ללא צורך ברענון.",
  "Make it yours": "התאם אישית",
  "Switch between light/dark themes and languages from the top bar.":
    "עבור בין ערכות נושא בהירות/כהות ושפות מסרגל הכלים העליון.",
  Back: "חזרה",
  "Get started": "בוא נתחיל",
  "Go to": "עבור אל",
  Overview: "סקירה כללית",
  "Switch to light theme": "עבור למצב בהיר",
  "Switch to dark theme": "עבור למצב כהה",
  Appearance: "מראה",
  Preferences: "העדפות",
  Session: "הפעלה",
  "No matches": "אין תוצאות",
  "Type a command or search records…": "הקלד פקודה או חפש רשומות…",
  "Business OS": "מערכת ניהול עסקי",
  "Team Calendar": "יומן צוות",
  "Meetings, deadlines, reminders and schedules.": "פגישות, מועדים סופיים, תזכורות ולוחות זמנים.",
  "New event": "אירוע חדש",
  "No location": "ללא מיקום",
  "No events scheduled": "אין אירועים מתוזמנים",
  "CRM Automations": "אוטומציות ניהול קשרי לקוחות",
  "Rules create follow-ups and notifications automatically.":
    "כללים יוצרים מעקבים והתראות באופן אוטומטי.",
  "New rule": "כלל חדש",
  "Run now": "הרץ עכשיו",
  Active: "פעיל",
  Paused: "מושהה",
  runs: "הרצות",
  Last: "אחרון",
  never: "מעולם לא",
  "follow-up task(s) created": "משימות מעקב נוצרו",
  "Approval Center": "מרכז אישורים",
  "Controlled decisions for financial and sensitive operations.":
    "החלטות מבוקרות לפעולות פיננסיות ורגישות.",
  "New request": "בקשה חדשה",
  "No amount": "ללא סכום",
  "No approval requests": "אין בקשות אישור",
  "Decision notes": "הערות החלטה",
  "Notes (optional)": "הערות (אופציונלי)",
  Confirm: "אשר",
  "Decision recorded": "ההחלטה נרשמה",
  "New approval request": "בקשת אישור חדשה",
  "What needs approval?": "מה דורש אישור?",
  "Amount in ILS (optional)": "סכום בשקלים (אופציונלי)",
  Reason: "סיבה",
  "Create request": "צור בקשה",
  "Approval request created": "בקשת האישור נוצרה",
  "Employee Self-Service": "שירות עצמי לעובדים",
  "Request leave": "בקש חופשה",
  "My tasks": "המשימות שלי",
  "No tasks": "אין משימות",
  "No requests": "אין בקשות",
  "Your account is secure.": "החשבון שלך מאובטח.",
  "Link an employee profile with the same login email to enable this portal.":
    "קשר פרופיל עובד עם אותו אימייל התחברות כדי להפעיל את הפורטל הזה.",
  "Start date": "תאריך התחלה",
  "End date": "תאריך סיום",
  "Submit request": "שלח בקשה",
  "Leave request submitted": "בקשת החופשה נשלחה",
  "Auditable finance, sales, HR and operations reporting.":
    "דיווח כספי, מכירות, משאבי אנוש ותפעול הניתן לביקורת.",
  "Download Excel workbook": "הורד חוברת עבודה של Excel",
  "Total income": "סך הכנסות",
  "Total expenses": "סך הוצאות",
  "Available report sheets": "גיליונות דוחות זמינים",
  "Sales Pipeline": "צינור מכירות",
  "Safe sandbox connectors ready for production credentials.":
    "מחברי סביבת בדיקה בטוחים, מוכנים לפרטי גישה לייצור.",
  integration: "אינטגרציה",
  "Test connection": "בדוק חיבור",
  "Authentication, sessions, passkeys and sensitive activity.":
    "אימות, הפעלות, מפתחות גישה ופעילות רגישה.",
  Disable: "בטל",
  Enable: "הפעל",
  "2FA": "אימות דו-שלבי",
  "push notifications": "התראות דחיפה",
  "Register passkey": "רשום מפתח גישה",
  "Failed logins (24h)": "כניסות כושלות (24 שעות)",
  "Active sessions": "הפעלות פעילות",
  "Locked accounts": "חשבונות נעולים",
  "Registered passkeys": "מפתחות גישה רשומים",
  "My devices": "המכשירים שלי",
  Unknown: "לא ידוע",
  Revoked: "בוטל",
  Revoke: "בטל",
  Passkeys: "מפתחות גישה",
  Added: "נוסף",
  "No passkeys registered yet.": "אין עדיין מפתחות גישה רשומים.",
  "Session revoked": "ההפעלה בוטלה",
  "Enable two-factor authentication": "הפעל אימות דו-שלבי",
  "6-digit code": "קוד בן 6 ספרות",
  "Add this secret to your authenticator app, then enter the 6-digit code it shows:":
    "הוסף את הקוד הסודי הזה לאפליקציית האימות שלך, לאחר מכן הזן את הקוד בן 6 הספרות שהיא מציגה:",
  "Two-factor authentication enabled": "אימות דו-שלבי הופעל",
  "Disable two-factor authentication": "בטל אימות דו-שלבי",
  "Current authenticator code": "קוד האימות הנוכחי",
  "Two-factor authentication disabled": "אימות דו-שלבי בוטל",
  "Operations Monitoring": "ניטור תפעולי",
  "Health, integrations, storage and unresolved errors.":
    "תקינות, אינטגרציות, אחסון ושגיאות שלא טופלו.",
  "Create backup": "צור גיבוי",
  Uptime: "זמן פעילות",
  min: "דקות",
  "Unresolved events": "אירועים שלא טופלו",
  "Provider health": "תקינות ספקים",
  "Runs automatically once every 24 hours; the last 30 are kept. Create one on demand or retrieve a checksum-verified point-in-time copy below.":
    "רץ אוטומטית אחת ל-24 שעות; 30 הגיבויים האחרונים נשמרים. ניתן ליצור גיבוי לפי דרישה או לאחזר עותק מאומת checksum לנקודת זמן למטה.",
  "New backup": "גיבוי חדש",
  "No backups yet": "אין עדיין גיבויים",
  "Creating backup…": "יוצר גיבוי…",
  "Backup completed": "הגיבוי הושלם",
  "Generated values can be replaced with your real company information.":
    "ניתן להחליף ערכים שנוצרו אוטומטית בפרטי החברה האמיתיים שלך.",
  Save: "שמור",
  "Setting updated": "ההגדרה עודכנה",
  "Push notifications are not supported by this browser": "התראות דחיפה אינן נתמכות בדפדפן זה",
  "Push notifications disabled": "התראות דחיפה בוטלו",
  "Notification permission was not granted": "ההרשאה להתראות לא ניתנה",
  "Push notifications enabled": "התראות דחיפה הופעלו",
  "Passkeys are not supported by this browser": "מפתחות גישה אינם נתמכים בדפדפן זה",
  "Name this passkey": "תן שם למפתח הגישה",
  "Device name": "שם המכשיר",
  "My device": "המכשיר שלי",
  "Passkey registered": "מפתח הגישה נרשם",
  "Passkey registration was cancelled": "רישום מפתח הגישה בוטל",
  Continue: "המשך",
  "Passkey sign-in was cancelled": "ההתחברות עם מפתח הגישה בוטלה",
  "CSV exported": "ה-CSV יוצא",
  "Skip to main content": "דלג לתוכן הראשי",
  "Convert to invoice": "המר לחשבונית",
  "Sending quote…": "שולח הצעת מחיר…",
  "Quote emailed to customer": "הצעת המחיר נשלחה ללקוח באימייל",
  "Convert quote to invoice": "המר הצעת מחיר לחשבונית",
  "Invoice number": "מספר חשבונית",
  "Due date": "תאריך יעד לתשלום",
  "Create invoice": "צור חשבונית",
  "Invoice created from quote": "החשבונית נוצרה מהצעת המחיר",
  "Copy link": "העתק קישור",
  "Link copied to clipboard": "הקישור הועתק ללוח",
  "Download payslips (PDF)": "הורד תלושי שכר (PDF)",
  "Download payslips": "הורד תלושי שכר",
  Month: "חודש",
  "Anonymous page-view counts from the public site. No cookies, no tracking of individuals.":
    "ספירת צפיות אנונימית מהאתר הציבורי. ללא עוגיות, ללא מעקב אחר משתמשים.",
  "Views (30 days)": "צפיות (30 יום)",
  "Views today": "צפיות היום",
  "Pages tracked": "עמודים במעקב",
  "Most viewed page": "העמוד הנצפה ביותר",
  "Daily views (last 30 days)": "צפיות יומיות (30 יום אחרונים)",
  "Top pages": "העמודים המובילים",
  "No page views recorded yet.": "עדיין לא נרשמו צפיות.",
  "Portal link": "קישור לאזור אישי",
  "Portal link copied to clipboard": "הקישור לאזור האישי הועתק ללוח",
  "Summarize account": "סכם חשבון לקוח",
  "Generating summary…": "יוצר סיכום…",
  "AI Summary": "סיכום AI",
};
function tr(s) {
  return (lang === "he" && PHRASE_HE[s]) || s;
}
function applyLangAttrs() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  document.body.classList.toggle("rtl", lang === "he");
  const skipLink = $(".skip-link");
  if (skipLink) skipLink.textContent = tr("Skip to main content");
}
const money = (v) =>
  new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
const date = (v) => (v ? new Date(v).toLocaleDateString() : "");
const getCsrfToken = () =>
  document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)?.[1] || "";
async function api(url, opt = {}) {
  let r = await fetch(API + url, {
    ...opt,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(opt.headers || {}),
    },
  });
  if (r.status === 401 && url != "/auth/refresh" && localStorage.accessToken) {
    const rr = await fetch(API + "/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": getCsrfToken() },
    });
    if (rr.ok) {
      const x = await rr.json();
      token = x.token;
      localStorage.accessToken = token;
      r = await fetch(API + url, {
        ...opt,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          ...(opt.headers || {}),
        },
      });
    }
  }
  if (!r.ok) {
    const x = await r.json().catch(() => ({}));
    throw new Error(x.error?.message || "Request failed");
  }
  return r.status === 204 ? null : r.json();
}
function loginView() {
  document.body.className = lang === "he" ? "rtl" : "";
  $("#app").innerHTML =
    `<div class="login"><div class="login-art"><div class="brand"><span class="brand-mark">G</span> Greece</div><h1>${tr("One platform.")}<br><span style="color:var(--primary2)">${tr("Total business clarity.")}</span></h1><p style="color:#98a4b8;max-width:560px;font-size:17px;line-height:1.7">${tr("Customers, sales, finance, people and projects—securely connected in one operating system.")}</p></div><div class="login-panel"><form class="login-box" id="loginForm"><div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow">${tr("Secure workspace")}</span><button type="button" class="icon-btn lang-btn" title="${tr("Switch language")}" aria-label="${tr("Switch language")}" onclick="toggleLanguage()">${langLabel()}</button></div><h1 style="font-size:34px;margin:12px 0 8px">${tr("Welcome back")}</h1><p class="muted">${tr("Sign in to Greece Business Platform")}</p><div class="field"><label>${tr("Email")}</label><input name="email" type="email" autocomplete="username" required></div><div class="field"><label>${tr("Password")}</label><input name="password" type="password" autocomplete="current-password" required></div><label style="display:flex;gap:8px;align-items:center;margin:15px 0"><input name="rememberMe" type="checkbox" checked> ${tr("Remember this device")}</label><button type="submit" class="btn" style="width:100%;padding:13px">${tr("Sign in securely")}</button><button type="button" class="btn secondary" style="width:100%;margin-top:9px" onclick="passkeyLogin()">${tr("Sign in with a passkey")}</button><button type="button" class="btn secondary" style="width:100%;margin-top:9px" onclick="forgotPassword()">${tr("Forgot password")}</button></form></div></div>`;
  $("#loginForm").onsubmit = login;
  handlePasswordResetLink();
  handleInviteLink();
}
async function login(e) {
  e.preventDefault();
  const b = Object.fromEntries(new FormData(e.target));
  b.rememberMe = !!e.target.rememberMe.checked;
  try {
    const x = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(b),
    });
    if (x.twoFactorRequired) return toast(tr("Enter your two-factor code"));
    token = x.token;
    localStorage.accessToken = token;
    user = x.user;
    appView();
  } catch (e) {
    toast(e.message);
  }
}
async function forgotPassword() {
  const data = await promptForm(tr("Forgot password"), [
    { name: "email", label: tr("Account email"), type: "email", required: true },
  ]);
  if (!data) return;
  const x = await api("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email: data.email }),
  });
  toast(
    x.developmentToken
      ? tr("Development reset token created")
      : tr("If the account exists, reset instructions were sent"),
  );
}
async function handlePasswordResetLink() {
  const resetToken = new URLSearchParams(location.hash.slice(1)).get("reset");
  if (!resetToken) return;
  history.replaceState(null, "", "/crm");
  const ok = await promptPasswordForm(
    tr("Choose a new password"),
    tr("At least 10 characters, with a letter and a number."),
    async (password) => {
      await api("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password }),
      });
    },
  );
  if (ok) toast(tr("Password updated. You can now sign in."));
}
async function handleInviteLink() {
  const inviteToken = new URLSearchParams(location.hash.slice(1)).get(
    "invite",
  );
  if (!inviteToken) return;
  history.replaceState(null, "", "/crm");
  const ok = await promptPasswordForm(
    tr("Activate your account"),
    tr(
      "Choose a password to finish setting up your account. At least 10 characters, with a letter and a number.",
    ),
    async (password) => {
      await api("/auth/users/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token: inviteToken, password }),
      });
    },
  );
  if (ok) toast(tr("Account activated. You can now sign in."));
}
const svg = (inner) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const iconBell = () =>
  svg(
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
  );
const iconSun = () =>
  svg(
    '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
  );
const iconMoon = () =>
  svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>');
const iconLogout = () =>
  svg(
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',
  );
const iconExternal = () =>
  svg(
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>',
  );
const themeIcon = () =>
  document.documentElement.dataset.theme === "dark" ? iconSun() : iconMoon();
const langLabel = () => (lang === "he" ? "EN" : "HE");
function sidebar() {
  const groups = {};
  for (const [k, m] of Object.entries(modules))
    (groups[m.group] ??= []).push([k, m]);
  return `<aside class="sidebar"><a class="brand" href="/"><span class="brand-mark">G</span><span class="brand-text">GREECE <small style="display:block;font-size:9px;color:#748096">BUSINESS OS</small></span></a>${Object.entries(
    groups,
  )
    .map(
      ([g, items]) =>
        `<div class="nav-group"><div class="nav-title">${title(g)}</div>${items.map(([k, m]) => `<button class="nav-item ${current === k ? "active" : ""}" data-module="${k}"><span>${m.icon}</span><span>${title(m.label)}</span></button>`).join("")}</div>`,
    )
    .join("")}</aside>`;
}
function appView() {
  document.body.className = document.documentElement.dir === "rtl" ? "rtl" : "";
  $("#app").innerHTML =
    `<div class="app">${sidebar()}<div class="workspace"><header class="topbar"><button class="icon-btn mobile-menu" aria-label="${tr("Open menu")}" onclick="$('.sidebar').classList.toggle('open')">☰</button><div class="global-search"><label class="sr-only" for="globalSearch">${tr("Search business records")}</label><input class="input" id="globalSearch" placeholder="${tr("Search customers, people, projects, invoices… (Ctrl/Cmd+K)")}"><div class="search-results" id="searchResults"></div></div><div class="top-actions"><a class="icon-btn" title="${tr("Back to website")}" aria-label="${tr("Back to website")}" href="/">${iconExternal()}</a><button class="icon-btn" id="themeToggle" title="${tr("Switch color theme")}" aria-label="${tr("Switch color theme")}" onclick="toggleTheme()">${themeIcon()}</button><button class="icon-btn lang-btn" id="langToggle" title="${tr("Switch language")}" aria-label="${tr("Switch language")}" onclick="toggleLanguage()">${langLabel()}</button><button class="icon-btn notification-button" title="${tr("Notifications")}" aria-label="${tr("Open notifications")}" onclick="openModule('notifications')">${iconBell()}<span id="notificationCount" hidden></span></button><div class="avatar">${(user?.name || "A").slice(0, 1)}</div><span class="user-name"><b>${escapeHtml(user?.name || "")}</b><small class="muted" style="display:block">${title(user?.role || "")}</small></span><button class="icon-btn" title="${tr("Logout")}" aria-label="${tr("Log out")}" onclick="logout()">${iconLogout()}</button></div></header><main class="content" id="content" tabindex="-1"></main></div></div>`;
  $$("[data-module]").forEach(
    (b) => (b.onclick = () => openModule(b.dataset.module)),
  );
  $("#globalSearch").oninput = globalSearch;
  startNotificationStream();
  render();
  maybeStartTour();
}
async function render() {
  history.replaceState({}, "", `/crm#${current}`);
  $$("[data-module]").forEach((b) =>
    b.classList.toggle("active", b.dataset.module === current),
  );
  if (current === "dashboard") return dashboard();
  if (modules[current].pipeline) return pipeline();
  if (modules[current].special) return specialView(modules[current].special);
  return tableView();
}
async function dashboard() {
  const el = $("#content");
  el.innerHTML = skeletonDashboard();
  try {
    const [x, emailStatus] = await Promise.all([
        api("/dashboard"),
        api("/system/email-status"),
      ]),
      k = x.kpis,
      isMorning = new Date().getHours() < 12,
      firstName = (user.name || "").split(" ")[0],
      greeting =
        lang === "he"
          ? `${isMorning ? "בוקר טוב" : "צהריים טובים"}, ${escapeHtml(firstName)}`
          : `Good ${isMorning ? "morning" : "afternoon"}, ${escapeHtml(firstName)}`;
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">${tr("Executive overview")}</span><h1>${greeting}</h1><p class="muted">${tr("Here is what is happening across your business today.")}</p></div><button class="btn" onclick="openModule('tasks');setTimeout(openCreate,20)">＋ ${tr("New task")}</button></div>${emailStatus.connected ? "" : `<div class="card" style="border-color:var(--yellow);margin-bottom:16px"><b>⚠ ${tr("Email delivery requires configuration")}</b><p class="muted" style="margin:7px 0 0">${tr("Contact forms are saved in CRM, but SMTP must be connected before messages can reach")} ${escapeHtml(emailStatus.recipient)}.</p></div>`}${!user.twoFactorEnabled && ["administrator", "super_admin"].includes(user.role) ? `<div class="card" style="border-color:var(--yellow);margin-bottom:16px"><b>⚠ ${tr("Two-factor authentication is not enabled")}</b><p class="muted" style="margin:7px 0 0">${tr("Your account has administrator access.")} <button class="btn secondary" style="padding:4px 12px;margin-inline-start:6px" onclick="openModule('security');setTimeout(setup2FA,20)">${tr("Enable 2FA now")}</button></p></div>` : ""}<div class="kpis">${[
      [tr("Revenue"), money(k.revenue), "↗ 12.4%"],
      [tr("Expenses"), money(k.expenses), tr("Current period")],
      [tr("Net profit"), money(k.profit), tr("Healthy margin")],
      [tr("Outstanding"), money(k.outstanding), tr("Invoices due")],
      [tr("Active customers"), k.customers, tr("Customer base")],
      [tr("Active projects"), k.projects, tr("In delivery")],
      [tr("Employees"), k.employees, tr("Active team")],
      [tr("Due today"), k.tasksToday, tr("Tasks requiring action")],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><div class="kpi-label">${v[0]}</div><div class="kpi-value">${v[1]}</div><div class="trend">${v[2]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><section class="card"><div class="card-head"><div><h3>${tr("Cash flow")}</h3><span class="muted">${tr("Income vs expenses")}</span></div><span class="badge">${tr("Last 12 months")}</span></div>${cashChart(x.cashflow)}</section><section class="card"><div class="card-head"><h3>${tr("Priority tasks")}</h3><button class="btn secondary" onclick="openModule('tasks')">${tr("View all")}</button></div>${x.tasks.length ? x.tasks.map((tk) => `<div class="task-row"><i class="priority ${escapeHtml(tk.priority)}"></i><div style="flex:1"><b>${escapeHtml(tk.title)}</b><small class="muted" style="display:block">${tr("Due")} ${date(tk.due_date)}</small></div><span class="badge ${escapeHtml(tk.status)}">${title(tk.status)}</span></div>`).join("") : `<div class="empty">${tr("No open tasks")}</div>`}</section></div><div class="dashboard-grid"><section class="card"><div class="card-head"><h3>${tr("Sales pipeline")}</h3><button class="btn secondary" onclick="openModule('deals')">${tr("Open pipeline")}</button></div>${x.pipeline.map((p) => `<div class="activity-row"><div style="flex:1"><b>${title(p.stage)}</b><div class="progress"><i style="width:${Math.min(100, p.count * 20)}%"></i></div></div><span>${p.count} · ${money(p.value)}</span></div>`).join("")}</section><section class="card"><div class="card-head"><h3>${tr("Notification center")}</h3><button class="btn secondary" onclick="openModule('notifications')">${tr("View all")}</button></div>${x.notifications.length ? x.notifications.map((n) => `<div class="activity-row"><span>◦</span><div><b>${escapeHtml(n.title)}</b><small class="muted" style="display:block">${escapeHtml(n.message || "")}</small></div></div>`).join("") : `<div class="empty">${tr("You are all caught up")}</div>`}</section></div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">${e.message}</div>`;
  }
}
async function specialView(kind) {
  const map = {
    calendar: calendarView,
    automations: automationsView,
    approvals: approvalsView,
    portal: portalView,
    reports: reportsView,
    integrations: integrationsView,
    security: securityView,
    analytics: analyticsView,
    monitoring: monitoringView,
    backups: backupsView,
    settings: settingsView,
  };
  return map[kind]?.();
}
async function calendarView() {
  const el = $("#content");
  try {
    const x = await api("/calendar_events?limit=100&sort=start_at&dir=asc");
    cache.calendar_events = x.data;
    el.innerHTML = `${pageHead(tr("Team Calendar"), tr("Meetings, deadlines, reminders and schedules."), `<button class="btn" onclick="openForm(null)">＋ ${tr("New event")}</button>`)}<div class="card"><div class="calendar-list">${x.data.map((e) => `<div class="activity-row"><div class="avatar" style="border-radius:10px">${new Date(e.start_at).getDate()}</div><div style="flex:1"><b>${escapeHtml(e.title)}</b><div class="muted">${new Date(e.start_at).toLocaleString()} · ${escapeHtml(e.location || tr("No location"))}</div></div><span class="badge ${escapeHtml(e.status)}">${title(e.event_type)}</span><button class="btn secondary" onclick="openEdit('${e.id}')">${tr("Edit")}</div>`).join("") || `<div class="empty">${tr("No events scheduled")}</div>`}</div></div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function automationsView() {
  const el = $("#content");
  try {
    const x = await api("/automation_rules?limit=100");
    cache.automation_rules = x.data;
    el.innerHTML = `${pageHead(tr("CRM Automations"), tr("Rules create follow-ups and notifications automatically."), `<button class="btn secondary" onclick="openForm(null)">＋ ${tr("New rule")}</button><button class="btn" onclick="runAutomations()">▶ ${tr("Run now")}</button>`)}<div class="grid3">${x.data.map((r) => `<div class="card"><div class="card-head"><span class="badge ${r.active ? "active" : "inactive"}">${r.active ? tr("Active") : tr("Paused")}</span><button class="btn secondary" onclick="openEdit('${r.id}')">${tr("Edit")}</button></div><h3>${escapeHtml(r.name)}</h3><p class="muted">${title(r.trigger_event)} · ${title(r.entity_type)}</p><small>${r.run_count || 0} ${tr("runs")} · ${tr("Last")} ${date(r.last_run_at) || tr("never")}</small></div>`).join("")}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function runAutomations() {
  try {
    const x = await api("/automations/run", { method: "POST", body: "{}" });
    toast(`${x.tasksCreated} ${tr("follow-up task(s) created")}`);
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function approvalsView() {
  const el = $("#content");
  try {
    const x = await api("/approval_requests?limit=100");
    cache.approval_requests = x.data;
    el.innerHTML = `${pageHead(tr("Approval Center"), tr("Controlled decisions for financial and sensitive operations."), `<button class="btn" onclick="createApproval()">＋ ${tr("New request")}</button>`)}<div class="card">${x.data.map((a) => `<div class="activity-row"><div style="flex:1"><b>${title(a.action)}</b><div class="muted">${title(a.entity_type)} · ${a.amount ? money(a.amount) : tr("No amount")} · ${escapeHtml(a.reason || "")}</div></div><span class="badge ${escapeHtml(a.status)}">${title(a.status)}</span>${a.status === "pending" ? `<button class="btn" onclick="decideApproval('${a.id}','approved')">${tr("Approve")}</button><button class="btn danger" onclick="decideApproval('${a.id}','rejected')">${tr("Reject")}</button>` : ""}</div>`).join("") || `<div class="empty">${tr("No approval requests")}</div>`}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function decideApproval(id, decision) {
  const data = await promptForm(tr("Decision notes"), [
    { name: "notes", label: tr("Notes (optional)") },
  ], tr("Confirm"));
  if (!data) return;
  try {
    await api(`/approvals/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, notes: data.notes || "" }),
    });
    toast(tr("Decision recorded"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function createApproval() {
  const data = await promptForm(tr("New approval request"), [
    { name: "action", label: tr("What needs approval?"), required: true },
    { name: "amount", label: tr("Amount in ILS (optional)"), type: "number" },
    { name: "reason", label: tr("Reason") },
  ], tr("Create request"));
  if (!data || !data.action) return;
  const action = data.action,
    amount = Number(data.amount || 0),
    reason = data.reason || "";
  try {
    await api("/approval_requests", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "transaction",
        action,
        amount,
        reason,
        requested_by: user.id,
        assigned_role: "administrator",
        status: "pending",
      }),
    });
    toast(tr("Approval request created"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function portalView() {
  const el = $("#content");
  try {
    const x = await api("/portal/me"),
      e = x.employee;
    el.innerHTML = `${pageHead(tr("Employee Self-Service"), `${e.full_name} · ${e.position || ""} · ${e.department || ""}`, `<button class="btn" onclick="requestLeave()">${tr("Request leave")}</button>`)}<div class="kpis">${[
      [tr("Employment"), title(e.status)],
      [tr("Vacation balance"), `${e.vacation_days || 0} ${tr("days")}`],
      [tr("Sick balance"), `${e.sick_days || 0} ${tr("days")}`],
      [tr("Open tasks"), x.tasks.filter((t) => t.status !== "done").length],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><div class="card"><h3>${tr("My tasks")}</h3>${x.tasks.map((t) => `<div class="task-row"><i class="priority ${escapeHtml(t.priority)}"></i><div><b>${escapeHtml(t.title)}</b><small class="muted"> · ${date(t.due_date)}</small></div></div>`).join("") || `<p class="muted">${tr("No tasks")}</p>`}</div><div class="card"><h3>${title("Leave Requests")}</h3>${x.leave.map((l) => `<div class="activity-row"><div><b>${title(l.leave_type)}</b><small class="muted"> · ${date(l.start_date)}–${date(l.end_date)}</small></div><span class="badge ${escapeHtml(l.status)}">${title(l.status)}</span></div>`).join("") || `<p class="muted">${tr("No requests")}</p>`}</div></div>`;
  } catch (e) {
    el.innerHTML = `${pageHead(tr("Employee Self-Service"), tr("Your account is secure."))}<div class="card empty">${escapeHtml(e.message)}<br><small>${tr("Link an employee profile with the same login email to enable this portal.")}</small></div>`;
  }
}
async function requestLeave() {
  const data = await promptForm(tr("Request leave"), [
    { name: "start", label: tr("Start date"), type: "date", required: true },
    { name: "end", label: tr("End date"), type: "date", required: true },
  ], tr("Submit request"));
  if (!data) return;
  const start = data.start,
    end = data.end;
  if (!start || !end) return;
  try {
    await api("/portal/leave", {
      method: "POST",
      body: JSON.stringify({
        leave_type: "vacation",
        start_date: start,
        end_date: end,
        days: Math.max(
          1,
          Math.round((new Date(end) - new Date(start)) / 86400000) + 1,
        ),
        reason: "Employee portal request",
      }),
    });
    toast(tr("Leave request submitted"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function reportsView() {
  const el = $("#content");
  try {
    const f = await api("/reports/finance");
    el.innerHTML = `${pageHead(title("Reports & Exports"), tr("Auditable finance, sales, HR and operations reporting."), `<button class="btn" onclick="downloadBusinessReport()">${tr("Download Excel workbook")}</button>`)}<div class="kpis"><div class="card kpi"><span class="kpi-label">${tr("Total income")}</span><div class="kpi-value">${money(f.totals.income)}</div></div><div class="card kpi"><span class="kpi-label">${tr("Total expenses")}</span><div class="kpi-value">${money(f.totals.expenses)}</div></div><div class="card kpi"><span class="kpi-label">${tr("Net profit")}</span><div class="kpi-value">${money(f.totals.income - f.totals.expenses)}</div></div></div><div class="card" style="margin-top:16px"><h3>${tr("Available report sheets")}</h3><p class="muted">${title("Customers")} · ${tr("Sales Pipeline")} · ${title("Finance")} · ${title("Invoices")} · ${title("Quotes")} · ${title("Employees")} · ${title("Projects")}</p></div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function integrationsView() {
  const el = $("#content");
  try {
    const rows = await api("/integrations");
    el.innerHTML = `${pageHead(title("Integrations"), tr("Safe sandbox connectors ready for production credentials."))}<div class="grid3">${rows.map((x) => `<div class="card"><div class="card-head"><span class="badge ${escapeHtml(x.status)}">${title(x.status)}</span><span>${title(x.mode)}</span></div><h3>${title(x.provider)}</h3><p class="muted">${title(x.category)} ${tr("integration")}</p><button class="btn secondary" onclick="testIntegration('${x.provider}')">${tr("Test connection")}</button></div>`).join("")}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function testIntegration(provider) {
  try {
    const x = await api(`/integrations/${provider}/test`, {
      method: "POST",
      body: "{}",
    });
    toast(`${title(provider)}: ${title(x.status)}`);
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function securityView() {
  const el = $("#content");
  try {
    const [x, passkeys, sessions, pushEnabled] = await Promise.all([
      api("/security/overview"),
      api("/auth/passkeys"),
      api("/auth/sessions"),
      isPushSubscribed(),
    ]);
    el.innerHTML = `${pageHead(title("Security Center"), tr("Authentication, sessions, passkeys and sensitive activity."), `<button class="btn secondary" onclick="${user.twoFactorEnabled ? "disable2FA()" : "setup2FA()"}">${user.twoFactorEnabled ? tr("Disable") : tr("Enable")} ${tr("2FA")}</button><button class="btn secondary" onclick="togglePushNotifications()">${pushEnabled ? tr("Disable") : tr("Enable")} ${tr("push notifications")}</button><button class="btn" onclick="registerPasskey()">＋ ${tr("Register passkey")}</button>`)}<div class="kpis">${[
      [tr("Failed logins (24h)"), x.failedLogins24h],
      [tr("Active sessions"), x.activeSessions],
      [tr("Locked accounts"), x.lockedAccounts],
      [tr("Registered passkeys"), x.passkeys],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><div class="card"><h3>${tr("My devices")}</h3>${sessions.map((s) => `<div class="activity-row"><div style="flex:1"><b>${escapeHtml((s.device || tr("Unknown")).slice(0, 60))}</b><small class="muted" style="display:block">${s.ip} · ${date(s.last_used_at)}</small></div>${s.revoked_at ? `<span class="badge overdue">${tr("Revoked")}</span>` : `<button class="btn danger" onclick="revokeSession('${s.id}')">${tr("Revoke")}</button>`}</div>`).join("")}</div><div class="card"><h3>${tr("Passkeys")}</h3>${passkeys.map((p) => `<div class="activity-row"><div style="flex:1"><b>${escapeHtml(p.device_name)}</b><small class="muted" style="display:block">${tr("Added")} ${date(p.created_at)}</small></div></div>`).join("") || `<p class="muted">${tr("No passkeys registered yet.")}</p>`}</div></div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function revokeSession(id) {
  try {
    await api("/auth/sessions/" + id, { method: "DELETE" });
    toast(tr("Session revoked"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function setup2FA() {
  try {
    const x = await api("/auth/2fa/setup", { method: "POST", body: "{}" });
    const data = await promptForm(
      tr("Enable two-factor authentication"),
      [{ name: "code", label: tr("6-digit code"), required: true }],
      tr("Enable"),
      `${tr("Add this secret to your authenticator app, then enter the 6-digit code it shows:")}<br><code>${escapeHtml(x.secret)}</code>`,
    );
    if (!data || !data.code) return;
    await api("/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code: data.code }),
    });
    user.twoFactorEnabled = true;
    toast(tr("Two-factor authentication enabled"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function disable2FA() {
  const data = await promptForm(
    tr("Disable two-factor authentication"),
    [{ name: "code", label: tr("Current authenticator code"), required: true }],
    tr("Disable"),
  );
  if (!data || !data.code) return;
  const code = data.code;
  try {
    await api("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    user.twoFactorEnabled = false;
    toast(tr("Two-factor authentication disabled"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function analyticsView() {
  const el = $("#content");
  el.innerHTML = skeletonDashboard();
  try {
    const x = await api("/analytics/overview");
    const byDay = Object.fromEntries(x.dailyViews.map((d) => [d.day, d.n]));
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });
    const max = Math.max(...days.map((d) => byDay[d] || 0), 1);
    const chart = `<div class="chart">${days
      .map(
        (d) =>
          `<div class="bar-group"><i class="bar" style="height:${((byDay[d] || 0) / max) * 100}%" title="${d}: ${byDay[d] || 0}"></i><span class="bar-label">${d.slice(5)}</span></div>`,
      )
      .join(
        "",
      )}</div>`;
    el.innerHTML = `${pageHead(title("Website Analytics"), tr("Anonymous page-view counts from the public site. No cookies, no tracking of individuals."))}<div class="kpis">${[
      [tr("Views (30 days)"), x.totalViews30d],
      [tr("Views today"), x.todayViews],
      [tr("Pages tracked"), x.topPages.length],
      [tr("Most viewed page"), x.topPages[0] ? title(x.topPages[0].page) : "—"],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="card" style="margin-top:16px"><h3>${tr("Daily views (last 30 days)")}</h3>${chart}</div><div class="card" style="margin-top:16px"><h3>${tr("Top pages")}</h3>${
      x.topPages
        .map(
          (p) =>
            `<div class="activity-row"><div style="flex:1"><b>${title(p.page)}</b></div><span>${p.n}</span></div>`,
        )
        .join("") || `<p class="muted">${tr("No page views recorded yet.")}</p>`
    }</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function monitoringView() {
  const el = $("#content");
  try {
    const x = await api("/monitoring/overview");
    el.innerHTML = `${pageHead(tr("Operations Monitoring"), tr("Health, integrations, storage and unresolved errors."), `<button class="btn" onclick="createBackup()">${tr("Create backup")}</button>`)}<div class="kpis">${[
      [title("system"), title(x.status)],
      [tr("Uptime"), `${Math.floor(x.uptimeSeconds / 60)} ${tr("min")}`],
      [title("Database"), `${Math.round(x.database.size / 1024)} KB`],
      [tr("Unresolved events"), x.unresolvedEvents.length],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="card" style="margin-top:16px"><h3>${tr("Provider health")}</h3>${x.integrations.map((i) => `<div class="activity-row"><div style="flex:1"><b>${title(i.provider)}</b><small class="muted" style="display:block">${title(i.mode)}</small></div><span class="badge ${escapeHtml(i.status)}">${title(i.status)}</span></div>`).join("")}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function backupsView() {
  const el = $("#content");
  try {
    const rows = await api("/backups");
    el.innerHTML = `${pageHead(title("Backups"), tr("Runs automatically once every 24 hours; the last 30 are kept. Create one on demand or retrieve a checksum-verified point-in-time copy below."), `<button class="btn" onclick="createBackup()">＋ ${tr("New backup")}</button>`)}<div class="card">${rows.map((b) => `<div class="activity-row"><div style="flex:1"><b>${escapeHtml(b.filename)}</b><small class="muted" style="display:block">${date(b.created_at)} · ${Math.round((b.size || 0) / 1024)} KB · ${escapeHtml((b.checksum || "").slice(0, 12))}</small></div><span class="badge ${escapeHtml(b.status)}">${title(b.status)}</span>${b.status === "completed" ? `<button class="btn secondary" onclick="downloadProtected('/backups/${b.id}/download','${escapeJs(b.filename)}')">${tr("Download")}</button>` : ""}</div>`).join("") || `<div class="empty">${tr("No backups yet")}</div>`}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function createBackup() {
  try {
    toast(tr("Creating backup…"));
    await api("/backups", { method: "POST", body: "{}" });
    toast(tr("Backup completed"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function settingsView() {
  const el = $("#content");
  try {
    const s = await api("/business-settings");
    businessSettingsCache = s;
    el.innerHTML = `${pageHead(title("Business Settings"), tr("Generated values can be replaced with your real company information."))}<div class="grid3">${Object.entries(
      s,
    )
      .map(
        ([k, v]) =>
          `<div class="card"><span class="kpi-label">${title(k)}</span><p style="font-size:16px;margin:10px 0;min-height:42px">${escapeHtml(v)}</p><button class="btn secondary" onclick="editSetting('${k}')">${tr("Edit")}</button></div>`,
      )
      .join("")}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function editSetting(key) {
  const data = await promptForm(
    `${tr("Update")} ${title(key)}`,
    [
      {
        name: "value",
        label: title(key),
        value: businessSettingsCache[key] || "",
      },
    ],
    tr("Save"),
  );
  if (!data) return;
  try {
    await api("/business-settings/" + key, {
      method: "PUT",
      body: JSON.stringify({ value: data.value }),
    });
    toast(tr("Setting updated"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function customer360(customerId) {
  const el = $("#content");
  el.innerHTML = skeleton360();
  try {
    const x = await api(`/customers/${customerId}/360`),
      c = x.customer;
    let tagList = [];
    try {
      tagList = JSON.parse(c.tags || "[]");
    } catch {
      /* leave empty if stored value isn't valid JSON */
    }
    el.innerHTML = `${pageHead(c.company_name, `${c.contact_name || ""} · ${c.email || ""} · ${c.phone || ""}`, `<button class="btn secondary" onclick="openModule('customers')">← ${title("Customers")}</button><button class="btn" onclick="addCustomerContact('${c.id}')">＋ ${tr("Contact")}</button><button class="btn secondary" onclick="sendWhatsApp('${c.id}','${escapeJs(c.phone || "")}')">${tr("WhatsApp")}</button><button class="btn secondary" onclick="copyPortalLink('${c.id}')">${tr("Portal link")}</button><button class="btn secondary" onclick="summarizeCustomerAccount('${c.id}')">✨ ${tr("Summarize account")}</button>`)}${tagList.length ? `<div style="margin:-10px 0 20px">${tagList.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join(" ")}</div>` : ""}<div id="aiSummaryArea"></div><div class="kpis">${[
      [
        tr("Pipeline"),
        money(x.deals.reduce((n, d) => n + Number(d.value || 0), 0)),
      ],
      [tr("Projects"), x.projects.length],
      [
        tr("Invoices"),
        money(x.invoices.reduce((n, i) => n + Number(i.total || 0), 0)),
      ],
      [tr("Open tasks"), x.tasks.filter((t) => t.status !== "done").length],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><section class="card"><div class="card-head"><h3>${tr("Contacts")}</h3></div>${x.contacts.map((p) => `<div class="activity-row"><div style="flex:1"><b>${escapeHtml(p.name)}</b><small class="muted" style="display:block">${escapeHtml(p.title || "")} · ${escapeHtml(p.email || "")} · ${escapeHtml(p.phone || "")}</small></div>${p.primary_contact ? `<span class="badge active">${tr("Primary")}</span>` : ""}</div>`).join("") || `<p class="muted">${tr("No additional contacts yet.")}</p>`}</section><section class="card"><h3>${tr("Recent activity")}</h3>${
      x.activities
        .concat(
          x.communications.map((a) => ({
            ...a,
            title: a.subject,
            description: a.content,
            occurred_at: a.occurred_at,
          })),
        )
        .sort((a, b) =>
          String(b.occurred_at).localeCompare(String(a.occurred_at)),
        )
        .slice(0, 10)
        .map(
          (a) =>
            `<div class="activity-row"><span>◦</span><div><b>${escapeHtml(a.title || a.type)}</b><small class="muted" style="display:block">${escapeHtml(a.description || "")} · ${date(a.occurred_at)}</small></div></div>`,
        )
        .join("") || `<p class="muted">${tr("Activity will appear here.")}</p>`
    }</section></div><div class="grid3" style="margin-top:16px"><section class="card"><h3>${title("Deals")}</h3>${miniRows(x.deals, "title", "value")}</section><section class="card"><h3>${title("Projects")}</h3>${miniRows(x.projects, "name", "status")}</section><section class="card"><h3>${title("Invoices")}</h3>${miniRows(x.invoices, "number", "total")}</section><section class="card"><h3>${title("Quotes")}</h3>${miniRows(x.quotes, "title", "total")}</section>${c.notes ? `<section class="card"><h3>${title("Notes")}</h3><p class="muted">${escapeHtml(c.notes)}</p></section>` : ""}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
async function employee360(employeeId) {
  const el = $("#content");
  el.innerHTML = skeleton360();
  try {
    const x = await api(`/employees/${employeeId}/360`),
      e = x.employee,
      recentAttendance = x.attendance.slice(0, 10),
      dayWord = tr("days");
    el.innerHTML = `${pageHead(e.full_name, `${e.position || ""} · ${e.department || ""} · ${e.email || ""}`, `<button class="btn secondary" onclick="openModule('employees')">← ${title("Employees")}</button>`)}<div class="kpis">${[
      [tr("Employment"), title(e.status)],
      [tr("Vacation balance"), `${e.vacation_days || 0} ${dayWord}`],
      [tr("Sick balance"), `${e.sick_days || 0} ${dayWord}`],
      [tr("Open tasks"), x.tasks.filter((t) => t.status !== "done").length],
    ]
      .map(
        (v) =>
          `<div class="card kpi"><span class="kpi-label">${v[0]}</span><div class="kpi-value">${v[1]}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="dashboard-grid"><section class="card"><h3>${tr("Recent attendance")}</h3>${recentAttendance.map((a) => `<div class="activity-row"><div style="flex:1">${date(a.date)}</div><span class="badge ${escapeHtml(a.status)}">${title(a.status)}</span></div>`).join("") || `<p class="muted">${tr("No attendance records yet.")}</p>`}</section><section class="card"><h3>${title("Leave Requests")}</h3>${x.leave.map((l) => `<div class="activity-row"><div style="flex:1"><b>${title(l.leave_type)}</b><small class="muted" style="display:block">${date(l.start_date)}–${date(l.end_date)}</small></div><span class="badge ${escapeHtml(l.status)}">${title(l.status)}</span></div>`).join("") || `<p class="muted">${tr("No leave requests yet.")}</p>`}</section></div><div class="grid3" style="margin-top:16px"><section class="card"><h3>${tr("Payroll history")}</h3>${miniRows(x.payroll, "month", "net_salary")}</section><section class="card"><h3>${tr("Assigned tasks")}</h3>${miniRows(x.tasks, "title", "status")}</section>${e.performance_notes ? `<section class="card"><h3>${title("performance_notes")}</h3><p class="muted">${escapeHtml(e.performance_notes)}</p></section>` : ""}</div>`;
  } catch (e) {
    el.innerHTML = errorView(e);
  }
}
function miniRows(rows, main, detail) {
  return (
    rows
      .slice(0, 6)
      .map(
        (r) =>
          `<div class="activity-row"><div style="flex:1"><b>${escapeHtml(r[main] || "")}</b></div><span>${["value", "total", "amount"].includes(detail) ? money(r[detail]) : title(r[detail])}</span></div>`,
      )
      .join("") || `<p class="muted">${tr("No records yet.")}</p>`
  );
}
async function addCustomerContact(customerId) {
  const data = await promptForm(
    tr("Add contact"),
    [
      { name: "name", label: tr("Contact name"), required: true },
      { name: "email", label: tr("Email (optional)"), type: "email" },
      { name: "phone", label: tr("Phone (optional)"), type: "tel" },
    ],
    tr("Add contact"),
  );
  if (!data || !data.name) return;
  try {
    await api(`/customers/${customerId}/contacts`, {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
      }),
    });
    toast(tr("Contact added"));
    customer360(customerId);
  } catch (e) {
    toast(e.message);
  }
}
async function sendWhatsApp(customerId, phone) {
  const data = await promptForm(
    tr("Sandbox WhatsApp message"),
    [
      {
        name: "message",
        label: tr("Message"),
        required: true,
        value: tr(
          "Hello, this is GREECE Maintenance & Staffing regarding your account.",
        ),
      },
    ],
    tr("Send"),
  );
  if (!data || !data.message) return;
  const message = data.message;
  try {
    const x = await api("/integrations/whatsapp/jobs", {
      method: "POST",
      body: JSON.stringify({
        job_type: "send_message",
        payload: { customer_id: customerId, phone, message },
      }),
    });
    toast(`${tr("WhatsApp sandbox job")} ${title(x.status)}`);
  } catch (e) {
    toast(e.message);
  }
}
function openFileUpload() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><form class="modal" id="fileForm"><div class="card-head"><div><span class="eyebrow">${tr("Secure storage")}</span><h2>${tr("Upload a file")}</h2></div><button type="button" class="icon-btn" aria-label="${tr("Close")}" onclick="$('#modal').remove()">×</button></div><div class="field"><label for="secureFile">${tr("File (PDF, image, text, CSV or XLSX; max 10 MB)")}</label><input id="secureFile" name="file" type="file" required></div><div class="form-grid"><div class="field"><label>${tr("Related record type")}</label><select name="entity_type"><option value="">${tr("General")}</option><option value="customer">${title("customer")}</option><option value="project">${title("project")}</option><option value="employee">${title("employee")}</option></select></div><div class="field"><label>${tr("Related record ID")}</label><input name="entity_id"></div><div class="field"><label>${tr("Minimum access role")}</label><select name="access_role"><option value="employee">${title("employee")}</option><option value="manager">${title("manager")}</option><option value="administrator">${title("administrator")}</option></select></div></div><div class="modal-actions"><button type="button" class="btn secondary" onclick="$('#modal').remove()">${tr("Cancel")}</button><button class="btn">${tr("Upload securely")}</button></div></form></div>`,
  );
  $("#fileForm").onsubmit = uploadFile;
}
async function uploadFile(e) {
  e.preventDefault();
  const form = e.target,
    file = form.file.files[0];
  if (!file) return;
  try {
    toast(tr("Uploading…"));
    const data = await fileToDataUrl(file);
    await api("/files", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        data,
        entity_type: form.entity_type.value || null,
        entity_id: form.entity_id.value || null,
        access_role: form.access_role.value,
      }),
    });
    $("#modal").remove();
    toast(tr("File uploaded"));
    render();
  } catch (error) {
    toast(error.message);
  }
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}
async function downloadProtected(url, filename) {
  try {
    const r = await fetch(API + url, {
      credentials: "include",
      headers: { Authorization: "Bearer " + token },
    });
    if (!r.ok)
      throw new Error(
        (await r.json().catch(() => ({}))).error?.message || "Download failed",
      );
    const blob = await r.blob(),
      href = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = href;
    a.download = filename || "download";
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  } catch (e) {
    toast(e.message);
  }
}
async function emailInvoice(id) {
  try {
    toast(tr("Sending invoice…"));
    await api(`/invoices/${id}/email`, { method: "POST", body: "{}" });
    toast(tr("Invoice emailed to customer"));
  } catch (e) {
    toast(e.message);
  }
}
async function emailQuote(id) {
  try {
    toast(tr("Sending quote…"));
    await api(`/quotes/${id}/email`, { method: "POST", body: "{}" });
    toast(tr("Quote emailed to customer"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function convertQuoteToInvoice(quoteId) {
  const data = await promptForm(
    tr("Convert quote to invoice"),
    [
      { name: "number", label: tr("Invoice number"), required: true },
      { name: "due_date", label: tr("Due date"), type: "date" },
    ],
    tr("Create invoice"),
  );
  if (!data || !data.number) return;
  try {
    await api(`/quotes/${quoteId}/convert`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    toast(tr("Invoice created from quote"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function copyQuoteLink(token) {
  const url = `${location.origin}/quote.html?token=${token}`;
  try {
    await navigator.clipboard.writeText(url);
    toast(tr("Link copied to clipboard"));
  } catch {
    toast(url);
  }
}
async function copyPortalLink(customerId) {
  try {
    const { portal_token } = await api(`/customers/${customerId}/portal-token`, {
      method: "POST",
      body: "{}",
    });
    const url = `${location.origin}/portal.html?token=${portal_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(tr("Portal link copied to clipboard"));
    } catch {
      toast(url);
    }
  } catch (e) {
    toast(e.message);
  }
}
async function summarizeCustomerAccount(customerId) {
  const area = $("#aiSummaryArea");
  if (!area) return;
  area.innerHTML = `<div class="card" style="margin-bottom:16px"><p class="muted">${tr("Generating summary…")}</p></div>`;
  try {
    const { summary } = await api(`/customers/${customerId}/ai-summary`, {
      method: "POST",
      body: "{}",
    });
    area.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>✨ ${tr("AI Summary")}</h3></div><p>${escapeHtml(summary)}</p></div>`;
  } catch (e) {
    area.innerHTML = `<div class="card" style="margin-bottom:16px"><p class="muted">${escapeHtml(e.message)}</p></div>`;
  }
}
function downloadBusinessReport() {
  return downloadProtected(
    "/reports/business.xlsx",
    "greece-business-report.xlsx",
  );
}
async function downloadPayslipBatch() {
  const data = await promptForm(
    tr("Download payslips"),
    [{ name: "month", label: tr("Month"), type: "month", required: true }],
    tr("Download"),
  );
  if (!data || !data.month) return;
  return downloadProtected(
    `/payroll/batch/${data.month}/pdf`,
    `payslips-${data.month}.pdf`,
  );
}
function updateNotificationBadge(rows) {
  const count = rows.filter((n) => !n.read_at).length,
    b = $("#notificationCount");
  if (!b) return;
  b.textContent = count > 99 ? "99+" : count;
  b.hidden = !count;
}
async function startNotificationStream() {
  notificationController?.abort();
  const controller = new AbortController();
  notificationController = controller;
  try {
    const initial = await api("/notifications?limit=100");
    updateNotificationBadge(initial.data);
    const response = await fetch(API + "/notifications/stream", {
      headers: { Authorization: "Bearer " + token },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error("Stream unavailable");
    const reader = response.body.getReader(),
      decoder = new TextDecoder();
    let buffer = "";
    while (!controller.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        const data = event
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6);
        if (data) updateNotificationBadge(JSON.parse(data));
      }
    }
  } catch (e) {
    if (!controller.signal.aborted)
      setTimeout(() => {
        if (notificationController === controller) startNotificationStream();
      }, 5000);
  }
}
const b64urlToBytes = (value) =>
  Uint8Array.from(
    atob(
      String(value)
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(String(value).length / 4) * 4, "="),
    ),
    (c) => c.charCodeAt(0),
  );
const bytesToB64url = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
function prepareRegistrationOptions(o) {
  o.challenge = b64urlToBytes(o.challenge);
  o.user.id = b64urlToBytes(o.user.id);
  o.excludeCredentials = (o.excludeCredentials || []).map((c) => ({
    ...c,
    id: b64urlToBytes(c.id),
  }));
  return o;
}
function prepareAuthenticationOptions(o) {
  o.challenge = b64urlToBytes(o.challenge);
  o.allowCredentials = (o.allowCredentials || []).map((c) => ({
    ...c,
    id: b64urlToBytes(c.id),
  }));
  return o;
}
function serializeCredential(c) {
  const response = { clientDataJSON: bytesToB64url(c.response.clientDataJSON) };
  for (const k of [
    "attestationObject",
    "authenticatorData",
    "signature",
    "userHandle",
  ])
    if (c.response[k]) response[k] = bytesToB64url(c.response[k]);
  if (c.response.getTransports)
    response.transports = c.response.getTransports();
  return {
    id: c.id,
    rawId: bytesToB64url(c.rawId),
    type: c.type,
    authenticatorAttachment: c.authenticatorAttachment,
    clientExtensionResults: c.getClientExtensionResults(),
    response,
  };
}
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4),
    base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/"),
    rawData = atob(base64),
    output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
async function isPushSubscribed() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return false;
  try {
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
      reg = await Promise.race([navigator.serviceWorker.ready, timeout]);
    if (!reg) return false;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}
async function togglePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return toast(tr("Push notifications are not supported by this browser"));
  try {
    const reg = await navigator.serviceWorker.ready,
      existing = await reg.pushManager.getSubscription();
    if (existing) {
      await api("/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: existing.endpoint }),
      });
      await existing.unsubscribe();
      toast(tr("Push notifications disabled"));
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        return toast(tr("Notification permission was not granted"));
      const { publicKey } = await api("/push/vapid-public-key"),
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      await api("/push/subscribe", { method: "POST", body: JSON.stringify(sub) });
      toast(tr("Push notifications enabled"));
    }
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function registerPasskey() {
  if (!window.PublicKeyCredential)
    return toast(tr("Passkeys are not supported by this browser"));
  try {
    const options = prepareRegistrationOptions(
        await api("/auth/passkeys/register/options", {
          method: "POST",
          body: "{}",
        }),
      ),
      credential = await navigator.credentials.create({ publicKey: options }),
      nameData = await promptForm(
        tr("Name this passkey"),
        [
          {
            name: "device_name",
            label: tr("Device name"),
            value: navigator.platform || tr("My device"),
            required: true,
          },
        ],
        tr("Save"),
      ),
      device_name = nameData?.device_name || tr("My device");
    await api("/auth/passkeys/register/verify", {
      method: "POST",
      body: JSON.stringify({
        response: serializeCredential(credential),
        device_name,
      }),
    });
    toast(tr("Passkey registered"));
    render();
  } catch (e) {
    toast(
      e.name === "NotAllowedError"
        ? tr("Passkey registration was cancelled")
        : e.message,
    );
  }
}
async function passkeyLogin() {
  if (!window.PublicKeyCredential)
    return toast(tr("Passkeys are not supported by this browser"));
  const data = await promptForm(
    tr("Sign in with a passkey"),
    [{ name: "email", label: tr("Account email"), type: "email", required: true }],
    tr("Continue"),
  );
  if (!data || !data.email) return;
  const email = data.email;
  try {
    const options = prepareAuthenticationOptions(
        await api("/auth/passkeys/options", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      ),
      credential = await navigator.credentials.get({ publicKey: options }),
      x = await api("/auth/passkeys/verify", {
        method: "POST",
        body: JSON.stringify({ response: serializeCredential(credential) }),
      });
    token = x.token;
    localStorage.accessToken = token;
    user = x.user;
    appView();
  } catch (e) {
    toast(
      e.name === "NotAllowedError"
        ? tr("Passkey sign-in was cancelled")
        : e.message,
    );
  }
}
function pageHead(titleText, desc, actions = "") {
  return `<div class="page-head"><div><span class="eyebrow">${tr("Business OS")}</span><h1>${escapeHtml(titleText)}</h1><p class="muted">${escapeHtml(desc)}</p></div>${actions}</div>`;
}
function errorView(e) {
  return `<div class="empty">${escapeHtml(e.message)}</div>`;
}
function skeletonKpis(n = 4) {
  return `<div class="skeleton-kpis">${Array(n).fill('<div class="skeleton skeleton-kpi"></div>').join("")}</div>`;
}
function skeletonRows(n = 6) {
  return Array(n)
    .fill('<div class="skeleton skeleton-row"></div>')
    .join("");
}
function skeletonPageHead(titleWidth = 220, descWidth = 320) {
  return `<div class="page-head"><div><div class="skeleton skeleton-title" style="width:${titleWidth}px"></div><div class="skeleton skeleton-line" style="width:${descWidth}px"></div></div></div>`;
}
function skeletonTableView() {
  return `${skeletonPageHead()}<section class="card table-card" style="padding:20px">${skeletonRows(7)}</section>`;
}
function skeletonDashboard() {
  return `${skeletonPageHead(280, 340)}${skeletonKpis(8)}<div class="dashboard-grid"><div class="card skeleton-card"></div><div class="card skeleton-card"></div></div>`;
}
function skeleton360() {
  return `${skeletonPageHead(240, 320)}${skeletonKpis(4)}<div class="dashboard-grid"><div class="card skeleton-card"></div><div class="card skeleton-card"></div></div>`;
}
function skeletonPipeline() {
  return `${skeletonPageHead(180, 300)}<div class="pipeline">${Array(5).fill('<div class="skeleton skeleton-card" style="min-height:420px"></div>').join("")}</div>`;
}
function cashChart(rows) {
  if (!rows.length) rows = [{ month: "Now", income: 1, expenses: 0 }];
  const max = Math.max(...rows.flatMap((x) => [x.income, x.expenses]), 1);
  return `<div class="chart">${rows.map((r) => `<div class="bar-group"><i class="bar" style="height:${(r.income / max) * 100}%" title="${title("income")} ${money(r.income)}"></i><i class="bar expense" style="height:${(r.expenses / max) * 100}%" title="${title("expense")} ${money(r.expenses)}"></i><span class="bar-label">${r.month}</span></div>`).join("")}</div><div style="display:flex;gap:20px;margin-top:35px"><span>● <small class="muted">${title("income")}</small></span><span style="color:var(--blue)">● <small class="muted">${title("expense")}</small></span></div>`;
}
let selectedIds = new Set();
async function tableView() {
  const el = $("#content"),
    m = modules[current];
  el.innerHTML = skeletonTableView();
  selectedIds = new Set();
  try {
    const x = await api(
      `/${current}?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
    );
    cache[current] = x.data;
    const fields = (
      m.fields ||
      Object.keys(x.data[0] || {}).filter(
        (k) => !["id", "before_data", "after_data"].includes(k),
      )
    ).slice(0, 7);
    const selectCol = m.readOnly
      ? ""
      : `<th><input type="checkbox" aria-label="${tr("Select all")}" onclick="toggleSelectAll(this.checked)"></th>`;
    const moduleLabel = title(m.label),
      moduleLabelLower = moduleLabel.toLowerCase(),
      addLabel = lang === "he" ? moduleLabel : m.label.replace(/s$/, "");
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">${title(m.group)}</span><h1>${moduleLabel}</h1><p class="muted">${x.pagination.total} ${tr("records · centrally managed and audited")}</p></div>${current === "users" ? `<button class="btn" onclick="inviteUser()">＋ ${tr("Invite user")}</button>` : m.readOnly ? "" : `<button class="btn" onclick="openCreate()">＋ ${tr("Add")} ${addLabel}</button>`}</div><div class="toolbar"><input class="input" value="${escapeHtml(search)}" placeholder="${tr("Search")} ${moduleLabelLower}…" onkeydown="if(event.key==='Enter'){search=this.value;page=1;render()}"><button class="btn secondary" onclick="search=$('.toolbar .input').value;page=1;render()">${tr("Filter")}</button><button class="btn secondary" onclick="exportCsv()">⇩ ${tr("Export CSV")}</button>${current === "invoices" ? `<button class="btn secondary" onclick="downloadBusinessReport()">${tr("Export Excel")}</button>` : ""}${current === "payroll" ? `<button class="btn secondary" onclick="downloadPayslipBatch()">${tr("Download payslips (PDF)")}</button>` : ""}</div><div id="bulkBar" class="toolbar" style="display:none"></div><section class="card table-card"><div class="table-scroll"><table><thead><tr>${selectCol}${fields.map((f) => `<th>${title(f)}</th>`).join("")}<th>${tr("Actions")}</th></tr></thead><tbody>${x.data.map((r) => `<tr>${m.readOnly ? "" : `<td><input type="checkbox" class="row-select" aria-label="${tr("Select row")}" data-id="${escapeHtml(r.id)}" onclick="toggleRowSelect('${escapeJs(r.id)}',this.checked)"></td>`}${fields.map((f) => `<td>${cell(f, r[f])}</td>`).join("")}<td>${rowActions(r, m)}</td></tr>`).join("")}</tbody></table></div>${x.data.length ? "" : `<div class="empty">${tr("No")} ${moduleLabelLower} ${tr("found.")}</div>`}<div class="pager"><span class="muted">${tr("Page")} ${x.pagination.page} ${tr("of")} ${Math.max(1, x.pagination.pages)}</span><div class="pager-buttons"><button class="btn secondary" ${page <= 1 ? "disabled" : ""} onclick="page--;render()">${tr("Previous")}</button><button class="btn secondary" ${page >= x.pagination.pages ? "disabled" : ""} onclick="page++;render()">${tr("Next")}</button></div></div></section>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">${e.message}</div>`;
  }
}
function updateBulkBar() {
  const bar = $("#bulkBar");
  if (!bar) return;
  if (selectedIds.size === 0) {
    bar.style.display = "none";
    bar.innerHTML = "";
    return;
  }
  const statusOptions = STATUS_OPTIONS[current];
  bar.style.display = "flex";
  bar.innerHTML = `<span class="muted">${selectedIds.size} ${tr("selected")}</span>${
    statusOptions
      ? `<select id="bulkStatus"><option value="">${tr("Set status…")}</option>${statusOptions.map((o) => `<option value="${o}">${title(o)}</option>`).join("")}</select><button class="btn secondary" onclick="bulkSetStatus()">${tr("Apply")}</button>`
      : ""
  }<button class="btn danger" onclick="bulkDelete()">${tr("Delete selected")}</button>`;
}
function toggleSelectAll(checked) {
  $$(".row-select").forEach((cb) => {
    cb.checked = checked;
    if (checked) selectedIds.add(cb.dataset.id);
    else selectedIds.delete(cb.dataset.id);
  });
  updateBulkBar();
}
function toggleRowSelect(id, checked) {
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  updateBulkBar();
}
async function bulkDelete() {
  const ids = [...selectedIds];
  if (!ids.length) return;
  const recordWord =
    lang === "he" ? (ids.length > 1 ? "רשומות" : "רשומה") : `record${ids.length > 1 ? "s" : ""}`;
  if (
    !(await confirmDialog(
      lang === "he"
        ? `למחוק ${ids.length} ${recordWord} שנבחרו? פעולה זו מתועדת.`
        : `Delete ${ids.length} selected ${recordWord}? This action is logged.`,
    ))
  )
    return;
  try {
    await Promise.all(
      ids.map((id) => api(`/${current}/${id}`, { method: "DELETE" })),
    );
    toast(
      lang === "he"
        ? `${ids.length} ${recordWord} נמחקו`
        : `${ids.length} ${recordWord} deleted`,
    );
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function bulkSetStatus() {
  const status = $("#bulkStatus")?.value;
  const ids = [...selectedIds];
  if (!status || !ids.length) return;
  try {
    await Promise.all(
      ids.map((id) =>
        api(`/${current}/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      ),
    );
    const recordWord =
      lang === "he" ? (ids.length > 1 ? "רשומות" : "רשומה") : `record${ids.length > 1 ? "s" : ""}`;
    toast(
      lang === "he"
        ? `הסטטוס עודכן עבור ${ids.length} ${recordWord}`
        : `Status updated for ${ids.length} ${recordWord}`,
    );
    render();
  } catch (e) {
    toast(e.message);
  }
}
function rowActions(r, m) {
  const extra =
    current === "customers"
      ? `<button class="btn secondary" onclick="customer360('${r.id}')">360°</button> `
      : current === "employees"
        ? `<button class="btn secondary" onclick="employee360('${r.id}')">360°</button> `
        : current === "invoices"
        ? `<button class="btn secondary" onclick="downloadProtected('/invoices/${r.id}/pdf','${escapeJs(r.number)}.pdf')">${tr("PDF")}</button> <button class="btn secondary" onclick="emailInvoice('${r.id}')">${tr("Email")}</button> `
        : current === "quotes"
        ? `<button class="btn secondary" onclick="downloadProtected('/quotes/${r.id}/pdf','${escapeJs(r.number)}.pdf')">${tr("PDF")}</button> <button class="btn secondary" onclick="emailQuote('${r.id}')">${tr("Email")}</button> <button class="btn secondary" onclick="copyQuoteLink('${escapeJs(r.public_token)}')">${tr("Copy link")}</button> ${r.status === "accepted" ? `<button class="btn" onclick="convertQuoteToInvoice('${r.id}')">${tr("Convert to invoice")}</button> ` : ""}`
        : current === "payroll"
          ? `<button class="btn secondary" onclick="downloadProtected('/payroll/${r.id}/pdf','payslip-${escapeJs(r.month)}.pdf')">${tr("PDF")}</button> `
          : current === "documents"
          ? `<button class="btn secondary" onclick="downloadProtected('/files/${r.id}/download','${escapeJs(r.name)}')">${tr("Download")}</button> `
          : current === "notifications" && !r.read_at
            ? `<button class="btn secondary" onclick="markNotificationRead('${r.id}')">${tr("Mark read")}</button> `
            : current === "leave_requests" && r.status === "pending"
              ? `<button class="btn" onclick="decideLeave('${r.id}','approved')">${tr("Approve")}</button> <button class="btn danger" onclick="decideLeave('${r.id}','rejected')">${tr("Reject")}</button> `
              : "";
  return (
    extra +
    (m.readOnly
      ? ""
      : `<button class="btn secondary" onclick="openEdit('${r.id}')">${tr("Edit")}</button> <button class="btn danger" onclick="removeRecord('${r.id}')">${tr("Delete")}</button>`)
  );
}
async function markNotificationRead(id) {
  try {
    await api(`/notifications/${id}/read`, { method: "PATCH", body: "{}" });
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function decideLeave(id, decision) {
  try {
    await api(`/leave/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
    toast(`${tr("Leave request")} ${title(decision)}`);
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function pipeline() {
  const el = $("#content");
  el.innerHTML = skeletonPipeline();
  try {
    const x = await api("/deals?limit=100");
    cache.deals = x.data;
    const stages = ["qualification", "proposal", "negotiation", "won", "lost"];
    const q = search.trim().toLowerCase(),
      data = q ? x.data.filter((d) => d.title.toLowerCase().includes(q)) : x.data;
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">${title("crm")}</span><h1>${tr("Sales pipeline")}</h1><p class="muted">${tr("Track value, probability and expected close across every opportunity.")}</p></div><button class="btn" onclick="openCreate()">＋ ${tr("New deal")}</button></div><div class="toolbar"><input class="input" value="${escapeHtml(search)}" placeholder="${tr("Search deals…")}" onkeydown="if(event.key==='Enter'){search=this.value;render()}"><button class="btn secondary" onclick="search=$('.toolbar .input').value;render()">${tr("Filter")}</button><button class="btn secondary" onclick="exportCsv()">⇩ ${tr("Export CSV")}</button></div><div class="pipeline">${stages
      .map((s) => {
        const rows = data.filter((d) => d.stage === s);
        return `<div class="column"><div class="column-head"><span>${title(s)}</span><span class="badge">${rows.length}</span></div>${rows.map((d) => `<div class="deal-card" onclick="openEdit('${d.id}')"><b>${escapeHtml(d.title)}</b><div class="muted" style="margin-top:5px">${tr("Close")} ${date(d.expected_close) || tr("not set")}</div><div class="deal-value">${money(d.value)}</div><div class="progress" style="margin-top:9px"><i style="width:${d.probability || 0}%"></i></div></div>`).join("")}</div>`;
      })
      .join("")}</div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty">${e.message}</div>`;
  }
}
function openCreate() {
  if (current === "documents") return openFileUpload();
  openForm(null);
}
function openEdit(id) {
  openForm((cache[current] || []).find((x) => x.id === id));
}
function openForm(record) {
  const m = modules[current],
    fields = m.fields || [];
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><form class="modal" id="recordForm"><div class="card-head"><div><span class="eyebrow">${record ? tr("Update") : tr("Create")}</span><h2>${record ? tr("Edit") : tr("New")} ${lang === "he" ? title(m.label) : m.label.replace(/s$/, "")}</h2></div><button type="button" class="icon-btn" aria-label="${tr("Close")}" onclick="$('#modal').remove()">×</button></div><div class="form-grid">${fields.map((f) => inputField(f, record?.[f])).join("")}</div><div class="modal-actions"><button type="button" class="btn secondary" onclick="$('#modal').remove()">${tr("Cancel")}</button><button class="btn">${record ? tr("Save changes") : tr("Create record")}</button></div></form></div>`,
  );
  if (current === "invoices" || current === "quotes") wireVatCalculation();
  wireNamePickers();
  $("#recordForm").onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    for (const [k, v] of Object.entries(data))
      if (
        [
          "amount",
          "value",
          "score",
          "probability",
          "progress",
          "budget",
          "spent",
          "salary",
          "base_salary",
          "bonuses",
          "deductions",
          "tax",
          "net_salary",
          "subtotal",
          "vat_rate",
          "vat_amount",
          "total",
          "balance",
          "days",
          "active",
        ].includes(k)
      )
        data[k] = Number(v || 0);
    if (fields.includes("active") && !("active" in data)) data.active = 0;
    if (fields.includes("tags"))
      data.tags = String(data.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    if (
      fields.includes("email") &&
      fields.includes("phone") &&
      !String(data.email || "").trim() &&
      !String(data.phone || "").trim()
    ) {
      toast(tr("Enter a phone number or email so you have a way to reach them"));
      return;
    }
    try {
      await api(`/${current}${record ? "/" + record.id : ""}`, {
        method: record ? "PATCH" : "POST",
        body: JSON.stringify(data),
      });
      $("#modal").remove();
      toast(record ? tr("Record updated") : tr("Record created"));
      render();
    } catch (e) {
      toast(e.message);
    }
  };
}
async function wireNamePickers() {
  const selects = $$("#recordForm select[data-picker]");
  for (const select of selects) {
    const entity = select.dataset.picker,
      current_ = select.dataset.current;
    try {
      const x = await api(`/${entity}?limit=100`);
      const labelFor = (r) => r.company_name || r.full_name || r.name || r.id;
      const options = x.data.map(
        (r) =>
          `<option value="${escapeHtml(r.id)}" ${r.id === current_ ? "selected" : ""}>${escapeHtml(labelFor(r))}</option>`,
      );
      select.innerHTML = `<option value="">— ${tr("Select")} —</option>${options.join("")}`;
      if (current_) select.value = current_;
    } catch {
      select.innerHTML = `<option value="${escapeHtml(current_ || "")}">${current_ ? escapeHtml(current_) : "— " + tr("Select") + " —"}</option>`;
    }
  }
}
function wireVatCalculation() {
  const subtotalEl = $('#recordForm input[name="subtotal"]'),
    vatRateEl = $('#recordForm input[name="vat_rate"]'),
    vatAmountEl = $('#recordForm input[name="vat_amount"]'),
    totalEl = $('#recordForm input[name="total"]');
  if (!subtotalEl || !vatRateEl || !vatAmountEl || !totalEl) return;
  vatAmountEl.readOnly = true;
  totalEl.readOnly = true;
  vatAmountEl.tabIndex = -1;
  totalEl.tabIndex = -1;
  const recalc = () => {
    const subtotal = Number(subtotalEl.value || 0),
      vatRate = Number(vatRateEl.value || 0),
      vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
    vatAmountEl.value = vatAmount.toFixed(2);
    totalEl.value = (subtotal + vatAmount).toFixed(2);
  };
  subtotalEl.addEventListener("input", recalc);
  vatRateEl.addEventListener("input", recalc);
  recalc();
}
const STATUS_OPTIONS = {
  customers: ["active", "inactive"],
  tasks: ["todo", "in_progress", "done"],
  projects: ["planning", "active", "on_hold", "completed", "cancelled"],
  calendar_events: ["scheduled", "completed", "cancelled"],
  approval_requests: ["pending", "approved", "rejected"],
  employees: ["active", "inactive", "on_leave", "terminated"],
  attendance: ["present", "absent", "late"],
  leave_requests: ["pending", "approved", "rejected"],
  payroll: ["draft", "processed", "paid"],
  invoices: ["draft", "sent", "paid", "overdue", "cancelled"],
  quotes: ["draft", "sent", "accepted", "rejected", "expired", "converted"],
  job_listings: ["active", "closed", "draft"],
  job_applications: ["pending", "reviewing", "interviewed", "hired", "rejected"],
};
const TYPE_OPTIONS = {
  transactions: ["income", "expense"],
  communications: ["email", "phone", "meeting", "note"],
};
function inputField(f, v = "") {
  const types = {
    email: "email",
    phone: "tel",
    date: "date",
    due_date: "date",
    issue_date: "date",
    valid_until: "date",
    expected_close: "date",
    start_date: "date",
    end_date: "date",
    deadline: "date",
    hire_date: "date",
    month: "month",
    follow_up_at: "datetime-local",
    occurred_at: "datetime-local",
    start_at: "datetime-local",
    end_at: "datetime-local",
  };
  const options = {
    status: STATUS_OPTIONS[current] || [
      "active",
      "inactive",
      "scheduled",
      "completed",
      "cancelled",
      "draft",
      "sent",
      "paid",
      "overdue",
      "todo",
      "in_progress",
      "done",
      "pending",
    ],
    stage: ["new", "qualified", "proposal", "negotiation", "won", "lost"],
    priority: ["low", "medium", "high", "urgent"],
    type: TYPE_OPTIONS[current] || ["income", "expense", "email", "phone", "meeting", "note"],
    event_type: ["meeting", "deadline", "reminder", "shift", "inspection"],
    leave_type: ["vacation", "sick", "personal", "unpaid"],
    source: ["website", "referral", "campaign", "organic", "partner"],
    currency: ["ILS", "USD", "EUR"],
    employment_type: ["full_time", "part_time", "temporary", "contract"],
  };
  if (f === "active")
    return `<div class="field"><label><input name="active" type="checkbox" value="1" ${Number(v) !== 0 ? "checked" : ""}> ${tr("Active rule")}</label></div>`;
  if (f === "tags") {
    let list = [];
    try {
      list = JSON.parse(v || "[]");
    } catch {
      /* leave empty if stored value isn't valid JSON */
    }
    return `<div class="field"><label>${tr("Tags")}</label><input name="tags" type="text" value="${escapeHtml(list.join(", "))}" placeholder="${tr("vip, contract, referral")}"><small class="muted">${tr("Comma-separated")}</small></div>`;
  }
  if (f === "customer_id" || f === "employee_id")
    return `<div class="field"><label>${title(f)}</label><select name="${f}" data-picker="${f === "customer_id" ? "customers" : "employees"}" data-current="${escapeHtml(v || "")}"><option value="${escapeHtml(v || "")}">${v ? tr("Loading…") : "— " + tr("Select") + " —"}</option></select></div>`;
  if (options[f])
    return `<div class="field"><label>${title(f)}</label><select name="${f}">${options[f].map((o) => `<option value="${o}" ${v === o ? "selected" : ""}>${title(o)}</option>`).join("")}</select></div>`;
  if (
    [
      "notes",
      "description",
      "message",
      "content",
      "requirements",
      "experience",
      "performance_notes",
      "conditions",
      "actions",
      "reason",
    ].includes(f)
  )
    return `<div class="field" style="grid-column:1/-1"><label>${title(f)}</label><textarea name="${f}" rows="3">${escapeHtml(v || "")}</textarea></div>`;
  let value = v ?? "";
  if (types[f] === "datetime-local" && value)
    value = String(value).slice(0, 16);
  return `<div class="field"><label>${title(f)}</label><input name="${f}" type="${types[f] || (["amount", "value", "score", "probability", "progress", "budget", "spent", "salary", "base_salary", "bonuses", "deductions", "tax", "net_salary", "subtotal", "vat_rate", "vat_amount", "total", "balance", "days"].includes(f) ? "number" : "text")}" value="${escapeHtml(value)}" ${["company_name", "full_name", "title", "name", "number", "start_at"].includes(f) ? "required" : ""}></div>`;
}
function confirmDialog(message) {
  return new Promise((resolve) => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-backdrop" id="confirmModal"><div class="modal" style="max-width:420px"><p style="margin:0 0 20px">${escapeHtml(message)}</p><div class="modal-actions"><button type="button" class="btn secondary" id="confirmCancel">${tr("Cancel")}</button><button type="button" class="btn danger" id="confirmOk">${tr("Delete")}</button></div></div></div>`,
    );
    const cleanup = (result) => {
      $("#confirmModal")?.remove();
      resolve(result);
    };
    $("#confirmCancel").onclick = () => cleanup(false);
    $("#confirmOk").onclick = () => cleanup(true);
    $("#confirmOk").focus();
  });
}
function promptForm(title, fields, submitLabel = tr("Submit"), note = "") {
  return new Promise((resolve) => {
    const fieldsHtml = fields
      .map(
        (f) =>
          `<div class="field"><label>${escapeHtml(f.label)}</label>${
            f.type === "select"
              ? `<select name="${escapeHtml(f.name)}">${(f.options || [])
                  .map(
                    (o) =>
                      `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`,
                  )
                  .join("")}</select>`
              : `<input name="${escapeHtml(f.name)}" type="${f.type || "text"}" value="${escapeHtml(f.value || "")}" ${f.required ? "required" : ""}>`
          }</div>`,
      )
      .join("");
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-backdrop" id="promptModal"><form class="modal" id="promptFormEl" style="max-width:420px"><div class="card-head"><h2>${escapeHtml(title)}</h2><button type="button" class="icon-btn" aria-label="${tr("Close")}" id="promptClose">×</button></div>${note ? `<p class="muted" style="margin:0 0 16px;word-break:break-all">${note}</p>` : ""}<div id="promptError" style="color:var(--red);font-size:14px;min-height:20px"></div>${fieldsHtml}<div class="modal-actions"><button type="button" class="btn secondary" id="promptCancel">${tr("Cancel")}</button><button class="btn">${escapeHtml(submitLabel)}</button></div></form></div>`,
    );
    const cleanup = (result) => {
      $("#promptModal")?.remove();
      resolve(result);
    };
    $("#promptClose").onclick = () => cleanup(null);
    $("#promptCancel").onclick = () => cleanup(null);
    $("#promptFormEl").onsubmit = (e) => {
      e.preventDefault();
      cleanup(Object.fromEntries(new FormData(e.target)));
    };
    $("#promptFormEl input, #promptFormEl select")?.focus();
  });
}
function promptPasswordForm(title, description, onSubmit) {
  return new Promise((resolve) => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-backdrop" id="pwModal"><form class="modal" id="pwForm" style="max-width:420px"><div class="card-head"><h2>${escapeHtml(title)}</h2><button type="button" class="icon-btn" aria-label="${tr("Close")}" id="pwClose">×</button></div>${description ? `<p class="muted" style="margin:0 0 16px">${escapeHtml(description)}</p>` : ""}<div class="field"><label>${tr("New password")}</label><input name="password" type="password" autocomplete="new-password" required></div><div class="field"><label>${tr("Repeat password")}</label><input name="confirm" type="password" autocomplete="new-password" required></div><div id="pwError" style="color:var(--red);font-size:14px;min-height:20px"></div><div class="modal-actions"><button type="button" class="btn secondary" id="pwCancel">${tr("Cancel")}</button><button class="btn">${tr("Set password")}</button></div></form></div>`,
    );
    const cleanup = (result) => {
      $("#pwModal")?.remove();
      resolve(result);
    };
    $("#pwClose").onclick = () => cleanup(false);
    $("#pwCancel").onclick = () => cleanup(false);
    $("#pwForm").onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target)),
        errEl = $("#pwError");
      errEl.textContent = "";
      if (data.password !== data.confirm) {
        errEl.textContent = tr("Passwords do not match");
        return;
      }
      try {
        await onSubmit(data.password);
        cleanup(true);
      } catch (error) {
        errEl.textContent = error.message;
      }
    };
  });
}
async function inviteUser() {
  try {
    const roles = await api("/auth/roles");
    const data = await promptForm(tr("Invite a new user"), [
      { name: "name", label: tr("Full name"), required: true },
      { name: "email", label: tr("Email"), type: "email", required: true },
      {
        name: "role_id",
        label: tr("Role"),
        type: "select",
        options: roles.map((r) => ({ value: r.id, label: r.name })),
      },
    ], tr("Send invite"));
    if (!data) return;
    await api("/auth/users/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
    toast(tr("Invite sent"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
async function removeRecord(id) {
  if (!(await confirmDialog(tr("Delete this record? This action is logged."))))
    return;
  try {
    await api(`/${current}/${id}`, { method: "DELETE" });
    toast(tr("Record deleted"));
    render();
  } catch (e) {
    toast(e.message);
  }
}
function cell(k, v) {
  if (k === "status" || k === "stage" || k === "priority")
    return `<span class="badge ${escapeHtml(v)}">${title(v || "—")}</span>`;
  if (k === "tags") {
    let list = [];
    try {
      list = JSON.parse(v || "[]");
    } catch {
      /* leave empty if stored value isn't valid JSON */
    }
    return list.length
      ? list.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join(" ")
      : "—";
  }
  if (
    [
      "amount",
      "value",
      "salary",
      "total",
      "balance",
      "budget",
      "spent",
      "net_salary",
      "base_salary",
    ].includes(k)
  )
    return money(v);
  if (k.includes("date") || k.endsWith("_at")) return date(v);
  if (k === "progress" || k === "probability")
    return `<div style="min-width:100px"><div class="progress"><i style="width:${v || 0}%"></i></div><small>${v || 0}%</small></div>`;
  return escapeHtml(v ?? "—");
}
async function globalSearch(e) {
  const box = $("#searchResults"),
    q = e.target.value.trim();
  if (q.length < 2) {
    box.classList.remove("show");
    return;
  }
  try {
    const x = await api("/search?q=" + encodeURIComponent(q));
    box.innerHTML = x.length
      ? x
          .map(
            (r) =>
              `<div class="search-result" onclick="goToSearchResult('${escapeJs(r.type)}','${escapeJs(r.id)}')"><b>${escapeHtml(r.title)}</b><small class="muted" style="display:block">${title(r.type)}</small></div>`,
          )
          .join("")
      : `<div class="search-result muted">${tr("No results")}</div>`;
    box.classList.add("show");
  } catch {}
}
async function goToSearchResult(type, id) {
  $("#searchResults")?.classList.remove("show");
  if (!modules[type]) return openModule(type);
  current = type;
  page = 1;
  search = "";
  $(".sidebar")?.classList.remove("open");
  if (type === "customers") return customer360(id);
  await render();
  if (type !== "documents") openEdit(id);
}
function openModule(k) {
  if (!modules[k]) return;
  current = k;
  page = 1;
  search = "";
  $(".sidebar")?.classList.remove("open");
  render();
}
async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {}
  notificationController?.abort();
  localStorage.removeItem("accessToken");
  token = "";
  user = null;
  loginView();
}
function toggleTheme() {
  const d = document.documentElement;
  d.dataset.theme = d.dataset.theme === "dark" ? "light" : "dark";
  localStorage.theme = d.dataset.theme;
  const btn = $("#themeToggle");
  if (btn) btn.innerHTML = themeIcon();
}
function toggleLanguage() {
  lang = lang === "he" ? "en" : "he";
  localStorage.lang = lang;
  applyLangAttrs();
  toast(lang === "he" ? "הממשק הוחלף לעברית" : "Interface switched to English");
  if ($("#app .app")) appView();
  else if ($("#loginForm")) loginView();
}
async function exportCsv() {
  try {
    let r = await fetch(API + `/export/${current}.csv`, {
      credentials: "include",
      headers: { Authorization: "Bearer " + token },
    });
    if (r.status === 401 && localStorage.accessToken) {
      const rr = await fetch(API + "/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": getCsrfToken() },
      });
      if (rr.ok) {
        const x = await rr.json();
        token = x.token;
        localStorage.accessToken = token;
        r = await fetch(API + `/export/${current}.csv`, {
          credentials: "include",
          headers: { Authorization: "Bearer " + token },
        });
      }
    }
    if (!r.ok) throw Error("Export failed");
    const blob = await r.blob(),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = current + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(tr("CSV exported"));
  } catch (e) {
    toast(e.message);
  }
}
function title(s) {
  const raw = String(s || "");
  if (lang === "he" && WORD_HE[raw.toLowerCase()])
    return escapeHtml(WORD_HE[raw.toLowerCase()]);
  return escapeHtml(raw.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()));
}
function escapeHtml(v) {
  return String(v ?? "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function escapeJs(v) {
  const jsSafe = String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\r\n]/g, " ");
  return escapeHtml(jsSafe);
}
function toast(s) {
  const e = $("#toast");
  if (!e) return;
  e.textContent = s;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 2700);
}
const ONBOARDING_STEPS = [
  {
    icon: "⌂",
    title: "Your dashboard",
    text: "See revenue, tasks, and pipeline at a glance the moment you sign in.",
  },
  {
    icon: "⌘",
    title: "Search anything",
    text: "Press Ctrl+K (or Cmd+K on Mac) anytime to jump straight to customers, invoices, or projects.",
  },
  {
    icon: "♢",
    title: "Stay notified",
    text: "New leads and approvals show up here in real time — no refresh needed.",
  },
  {
    icon: "◐",
    title: "Make it yours",
    text: "Switch between light/dark themes and languages from the top bar.",
  },
];
let tourStep = 0;
function onboardingTourHtml() {
  const s = ONBOARDING_STEPS[tourStep];
  return `<div class="modal-backdrop" id="tourModal"><div class="modal" style="max-width:440px;text-align:center;position:relative"><button type="button" class="icon-btn" style="position:absolute;top:14px;right:14px" onclick="endTour()" aria-label="${tr("Skip tour")}">×</button><div style="font-size:40px;margin-bottom:14px">${s.icon}</div><h2 style="margin:0 0 10px">${tr(s.title)}</h2><p class="muted" style="margin:0 0 22px">${tr(s.text)}</p><div style="display:flex;justify-content:center;gap:6px;margin-bottom:22px">${ONBOARDING_STEPS.map((_, i) => `<span style="width:7px;height:7px;border-radius:50%;background:${i === tourStep ? "var(--primary)" : "var(--line)"}"></span>`).join("")}</div><div class="modal-actions" style="justify-content:center">${tourStep > 0 ? `<button type="button" class="btn secondary" onclick="tourStep--;renderTour()">${tr("Back")}</button>` : ""}<button type="button" class="btn" onclick="${tourStep < ONBOARDING_STEPS.length - 1 ? "tourStep++;renderTour()" : "endTour()"}">${tourStep < ONBOARDING_STEPS.length - 1 ? tr("Next") : tr("Get started")}</button></div></div></div>`;
}
function renderTour() {
  $("#tourModal")?.remove();
  document.body.insertAdjacentHTML("beforeend", onboardingTourHtml());
}
function endTour() {
  localStorage.onboardingSeen = "1";
  $("#tourModal")?.remove();
}
function maybeStartTour() {
  if (localStorage.onboardingSeen) return;
  tourStep = 0;
  renderTour();
}
let paletteItems = [],
  paletteIndex = 0,
  paletteSearchTimer = null;
function staticPaletteActions() {
  const actions = [
    {
      label: `${tr("Go to")} ${title(modules.dashboard.label)}`,
      hint: tr("Overview"),
      icon: modules.dashboard.icon,
      run: () => openModule("dashboard"),
    },
  ];
  for (const [k, m] of Object.entries(modules)) {
    if (k === "dashboard") continue;
    actions.push({
      label: `${tr("Go to")} ${title(m.label)}`,
      hint: title(m.group),
      icon: m.icon,
      run: () => openModule(k),
    });
  }
  for (const [k, m] of Object.entries(modules)) {
    if (m.readOnly || !m.fields?.length) continue;
    actions.push({
      label: `${tr("New")} ${lang === "he" ? title(m.label) : m.label.replace(/s$/, "")}`,
      hint: tr("Create"),
      icon: "＋",
      run: () => {
        openModule(k);
        openCreate();
      },
    });
  }
  actions.push({
    label: tr("Invite user"),
    hint: tr("Create"),
    icon: "＋",
    run: () => {
      openModule("users");
      inviteUser();
    },
  });
  actions.push({
    label:
      document.documentElement.dataset.theme === "dark"
        ? tr("Switch to light theme")
        : tr("Switch to dark theme"),
    hint: tr("Appearance"),
    icon: "◐",
    run: toggleTheme,
  });
  actions.push({
    label: tr("Switch language"),
    hint: tr("Preferences"),
    icon: "◈",
    run: toggleLanguage,
  });
  actions.push({ label: tr("Log out"), hint: tr("Session"), icon: "⏻", run: logout });
  return actions;
}
function paletteItemHtml(it, i) {
  return `<div class="palette-item ${i === paletteIndex ? "active" : ""}" data-i="${i}"><span class="palette-icon">${it.icon}</span><span class="palette-label">${escapeHtml(it.label)}</span><span class="palette-hint">${escapeHtml(it.hint)}</span></div>`;
}
function renderPaletteList() {
  const list = $("#paletteList");
  if (!list) return;
  list.innerHTML = paletteItems.length
    ? paletteItems.map(paletteItemHtml).join("")
    : `<div class="palette-item muted" style="cursor:default">${tr("No matches")}</div>`;
  $$(".palette-item[data-i]").forEach(
    (el) => (el.onclick = () => runPaletteItem(Number(el.dataset.i))),
  );
  $(".palette-item.active")?.scrollIntoView({ block: "nearest" });
}
function runPaletteItem(i) {
  const item = paletteItems[i];
  if (!item) return;
  closePalette();
  item.run();
}
function closePalette() {
  $("#commandPalette")?.remove();
}
function openCommandPalette() {
  if ($("#commandPalette")) return;
  paletteIndex = 0;
  paletteItems = staticPaletteActions();
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop command-palette" id="commandPalette"><div class="modal palette-modal"><input class="input" id="paletteInput" placeholder="${tr("Type a command or search records…")}" autocomplete="off"><div class="palette-list" id="paletteList">${paletteItems.map(paletteItemHtml).join("")}</div></div></div>`,
  );
  const backdrop = $("#commandPalette"),
    input = $("#paletteInput");
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closePalette();
  };
  input.oninput = () => {
    const q = input.value.trim(),
      lower = q.toLowerCase(),
      staticMatches = staticPaletteActions().filter((a) =>
        a.label.toLowerCase().includes(lower),
      );
    paletteIndex = 0;
    paletteItems = staticMatches;
    renderPaletteList();
    clearTimeout(paletteSearchTimer);
    if (q.length < 2) return;
    paletteSearchTimer = setTimeout(async () => {
      try {
        const results = await api("/search?q=" + encodeURIComponent(q));
        paletteItems = [
          ...staticMatches,
          ...results.map((r) => ({
            label: r.title,
            hint: title(r.type),
            icon: "→",
            run: () => goToSearchResult(r.type, r.id),
          })),
        ];
        renderPaletteList();
      } catch {}
    }, 200);
  };
  input.onkeydown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      paletteIndex = Math.min(paletteIndex + 1, paletteItems.length - 1);
      renderPaletteList();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      paletteIndex = Math.max(paletteIndex - 1, 0);
      renderPaletteList();
    } else if (e.key === "Enter") {
      e.preventDefault();
      runPaletteItem(paletteIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    }
  };
  input.focus();
}
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    if (!$("#app .app")) return;
    e.preventDefault();
    if ($("#commandPalette")) return closePalette();
    openCommandPalette();
  }
});
async function init() {
  document.documentElement.dataset.theme = localStorage.theme || "light";
  applyLangAttrs();
  const deepModule = location.pathname.match(/^\/crm\/([^/?#]+)/)?.[1];
  current =
    location.hash.slice(1) ||
    (deepModule && modules[deepModule] ? deepModule : "dashboard");
  if (!token) return loginView();
  try {
    user = await api("/auth/me");
    appView();
  } catch {
    localStorage.removeItem("accessToken");
    token = "";
    loginView();
  }
}
init();
