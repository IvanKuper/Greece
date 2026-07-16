PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  lead_id TEXT REFERENCES leads(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal REAL NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 17,
  vat_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  valid_until TEXT,
  notes TEXT,
  public_token TEXT UNIQUE NOT NULL,
  viewed_at TEXT,
  accepted_at TEXT,
  signed_name TEXT,
  signed_ip TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  quote_id TEXT REFERENCES quotes(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TEXT,
  end_date TEXT,
  renewal_date TEXT,
  value REAL NOT NULL DEFAULT 0,
  terms TEXT,
  public_token TEXT UNIQUE NOT NULL,
  signed_name TEXT,
  signed_at TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_portal_tokens (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  label TEXT,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  contact_name TEXT,
  contact_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT REFERENCES users(id),
  source TEXT DEFAULT 'crm',
  sla_due_at TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  asset_tag TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  status TEXT DEFAULT 'active',
  installed_at TEXT,
  warranty_until TEXT,
  next_service_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  project_id TEXT REFERENCES projects(id),
  service_request_id TEXT REFERENCES service_requests(id),
  asset_id TEXT REFERENCES assets(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'scheduled',
  assigned_employee_id TEXT REFERENCES employees(id),
  scheduled_start TEXT,
  scheduled_end TEXT,
  check_in_at TEXT,
  check_in_lat REAL,
  check_in_lng REAL,
  check_out_at TEXT,
  check_out_lat REAL,
  check_out_lng REAL,
  resolution TEXT,
  customer_signature TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS work_order_updates (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL,
  note TEXT,
  document_id TEXT REFERENCES documents(id),
  actor_id TEXT REFERENCES users(id),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  project_id TEXT REFERENCES projects(id),
  customer_id TEXT REFERENCES customers(id),
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  work_order_id TEXT REFERENCES work_orders(id),
  project_id TEXT REFERENCES projects(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  minutes INTEGER DEFAULT 0,
  entry_type TEXT DEFAULT 'work',
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'unit',
  quantity REAL DEFAULT 0,
  reorder_level REAL DEFAULT 0,
  unit_cost REAL DEFAULT 0,
  location TEXT,
  supplier TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  work_order_id TEXT REFERENCES work_orders(id),
  movement_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  balance_after REAL NOT NULL,
  reason TEXT,
  user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS communication_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  category TEXT,
  language TEXT DEFAULT 'he',
  subject TEXT,
  body TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS communication_consents (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  lead_id TEXT REFERENCES leads(id),
  channel TEXT NOT NULL,
  purpose TEXT NOT NULL,
  consented INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  captured_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  rule_id TEXT REFERENCES automation_rules(id),
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL,
  actions_completed INTEGER DEFAULT 0,
  output TEXT DEFAULT '{}',
  error TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dashboard_layout TEXT DEFAULT '[]',
  locale TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'dark',
  compact_mode INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS web_vitals (
  id TEXT PRIMARY KEY,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  rating TEXT,
  route TEXT,
  session_id TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_assistant_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  sources TEXT DEFAULT '[]',
  mode TEXT DEFAULT 'local',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS restore_tests (
  id TEXT PRIMARY KEY,
  backup_id TEXT REFERENCES backup_runs(id),
  status TEXT NOT NULL,
  integrity_result TEXT,
  row_counts TEXT DEFAULT '{}',
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_quotes_customer_status ON quotes(customer_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_status ON contracts(customer_id,status,end_date);
CREATE INDEX IF NOT EXISTS idx_requests_customer_status ON service_requests(customer_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_assets_customer_service ON assets(customer_id,next_service_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_schedule ON work_orders(status,scheduled_start,assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_schedule ON shifts(employee_id,start_at,end_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id,started_at);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder ON inventory_items(status,quantity,reorder_level);
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric ON web_vitals(metric,created_at);

INSERT OR IGNORE INTO communication_templates(id,name,channel,category,language,subject,body,active,created_at,updated_at) VALUES
('template-quote-he','Quote sent','email','sales','he','הצעת מחיר {{quote_number}} מ-GRIS','שלום {{contact_name}},\nהצעת המחיר שלך מוכנה לצפייה ואישור: {{quote_link}}',1,datetime('now'),datetime('now')),
('template-service-he','Service request received','email','service','he','פנייה {{request_number}} התקבלה','קיבלנו את הפנייה ונעדכן אותך לאורך הטיפול.',1,datetime('now'),datetime('now')),
('template-shift-he','Shift reminder','whatsapp','operations','he',NULL,'תזכורת: משמרת {{shift_title}} מתחילה ב-{{start_at}}.',1,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO inventory_items(id,sku,name,category,unit,quantity,reorder_level,unit_cost,location,supplier,status,created_at,updated_at) VALUES
('inventory-cleaner','CLN-001','Industrial floor cleaner','Cleaning','liter',46,20,18.5,'Central warehouse','Generated Supplier Ltd.','active',datetime('now'),datetime('now')),
('inventory-filter','MNT-014','HVAC replacement filter','Maintenance','unit',12,10,74,'Service van A','Generated Supplier Ltd.','active',datetime('now'),datetime('now')),
('inventory-gloves','SAFE-003','Protective work gloves','Safety','pair',18,25,12,'Central warehouse','Generated Supplier Ltd.','active',datetime('now'),datetime('now'));

INSERT OR IGNORE INTO assets(id,customer_id,asset_tag,name,category,manufacturer,model,serial_number,location,status,installed_at,warranty_until,next_service_at,notes,created_at,updated_at)
SELECT 'asset-demo-hvac',c.id,'HVAC-001','Main HVAC unit','HVAC','Generated Industries','GI-6000','DEMO-6000-01',c.address,'active','2025-01-15','2028-01-15',date('now','+14 days'),'Generated placeholder equipment record',datetime('now'),datetime('now') FROM customers c ORDER BY c.created_at LIMIT 1;

INSERT OR IGNORE INTO quotes(id,number,customer_id,title,status,subtotal,vat_rate,vat_amount,total,valid_until,notes,public_token,created_by,created_at,updated_at)
SELECT 'quote-demo-001','Q-1001',c.id,'Annual facility maintenance','sent',120000,17,20400,140400,date('now','+21 days'),'Generated quotation. Replace details before customer use.','demo-quote-public-token',u.id,datetime('now'),datetime('now') FROM customers c CROSS JOIN users u ORDER BY c.created_at,u.created_at LIMIT 1;
INSERT OR IGNORE INTO quote_items(id,quote_id,description,quantity,unit_price,total,sort_order) VALUES
('quote-item-demo-1','quote-demo-001','Preventive maintenance program',12,6500,78000,1),
('quote-item-demo-2','quote-demo-001','Emergency response coverage',12,3500,42000,2);

INSERT OR IGNORE INTO contracts(id,number,customer_id,quote_id,title,status,start_date,end_date,renewal_date,value,terms,public_token,created_by,created_at,updated_at)
SELECT 'contract-demo-001','C-1001',c.id,'quote-demo-001','Annual service agreement','active',date('now','-30 days'),date('now','+335 days'),date('now','+305 days'),140400,'Generated commercial terms. Legal review required before use.','demo-contract-public-token',u.id,datetime('now'),datetime('now') FROM customers c CROSS JOIN users u ORDER BY c.created_at,u.created_at LIMIT 1;

INSERT OR IGNORE INTO service_requests(id,number,customer_id,contact_name,contact_email,title,description,category,priority,status,assigned_to,source,sla_due_at,created_at,updated_at)
SELECT 'request-demo-001','SR-1001',c.id,c.contact_name,c.email,'Air-conditioning inspection','Temperature variation reported in the main operations area.','maintenance','high','in_progress',u.id,'portal',datetime('now','+4 hours'),datetime('now'),datetime('now') FROM customers c CROSS JOIN users u ORDER BY c.created_at,u.created_at LIMIT 1;

INSERT OR IGNORE INTO work_orders(id,number,customer_id,service_request_id,asset_id,title,description,priority,status,assigned_employee_id,scheduled_start,scheduled_end,created_at,updated_at)
SELECT 'work-order-demo-001','WO-1001',r.customer_id,r.id,'asset-demo-hvac','Inspect main HVAC unit','Check filters, temperature sensors and operating pressure.','high','scheduled',e.id,datetime('now','+1 day','start of day','+9 hours'),datetime('now','+1 day','start of day','+11 hours'),datetime('now'),datetime('now') FROM service_requests r CROSS JOIN employees e WHERE r.id='request-demo-001' ORDER BY e.created_at LIMIT 1;

INSERT OR IGNORE INTO shifts(id,employee_id,customer_id,title,start_at,end_at,location,status,notes,created_at,updated_at)
SELECT 'shift-demo-001',e.id,c.id,'Morning maintenance coverage',datetime('now','+1 day','start of day','+7 hours'),datetime('now','+1 day','start of day','+15 hours'),c.address,'scheduled','Generated schedule entry',datetime('now'),datetime('now') FROM employees e CROSS JOIN customers c ORDER BY e.created_at,c.created_at LIMIT 1;
