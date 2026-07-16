CREATE TABLE IF NOT EXISTS business_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, category TEXT DEFAULT 'general', updated_by TEXT REFERENCES users(id), updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customer_contacts (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE, name TEXT NOT NULL, title TEXT, email TEXT, phone TEXT, primary_contact INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, activity_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, user_id TEXT REFERENCES users(id), metadata TEXT DEFAULT '{}', occurred_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS automation_rules (id TEXT PRIMARY KEY, name TEXT NOT NULL, entity_type TEXT NOT NULL, trigger_event TEXT NOT NULL, conditions TEXT DEFAULT '{}', actions TEXT DEFAULT '[]', active INTEGER DEFAULT 1, last_run_at TEXT, run_count INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, title TEXT NOT NULL, event_type TEXT DEFAULT 'meeting', start_at TEXT NOT NULL, end_at TEXT, all_day INTEGER DEFAULT 0, location TEXT, description TEXT, customer_id TEXT REFERENCES customers(id), project_id TEXT REFERENCES projects(id), assigned_to TEXT REFERENCES users(id), reminder_minutes INTEGER DEFAULT 30, status TEXT DEFAULT 'scheduled', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leave_requests (id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id), leave_type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, days REAL DEFAULT 1, reason TEXT, status TEXT DEFAULT 'pending', approved_by TEXT REFERENCES users(id), decided_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS approval_requests (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT, action TEXT NOT NULL, requested_by TEXT NOT NULL REFERENCES users(id), assigned_role TEXT DEFAULT 'administrator', status TEXT DEFAULT 'pending', amount REAL, reason TEXT, decision_notes TEXT, decided_by TEXT REFERENCES users(id), decided_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS provider_integrations (id TEXT PRIMARY KEY, provider TEXT UNIQUE NOT NULL, category TEXT NOT NULL, mode TEXT DEFAULT 'sandbox', status TEXT DEFAULT 'not_configured', settings TEXT DEFAULT '{}', last_sync_at TEXT, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS integration_jobs (id TEXT PRIMARY KEY, provider TEXT NOT NULL, job_type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT DEFAULT 'queued', attempts INTEGER DEFAULT 0, scheduled_at TEXT NOT NULL, completed_at TEXT, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS monitoring_events (id TEXT PRIMARY KEY, level TEXT NOT NULL, source TEXT NOT NULL, event_type TEXT NOT NULL, message TEXT NOT NULL, metadata TEXT DEFAULT '{}', resolved_at TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS backup_runs (id TEXT PRIMARY KEY, filename TEXT NOT NULL, size INTEGER DEFAULT 0, status TEXT NOT NULL, checksum TEXT, error TEXT, created_at TEXT NOT NULL, completed_at TEXT);
CREATE TABLE IF NOT EXISTS passkey_credentials (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, credential_id TEXT UNIQUE NOT NULL, public_key TEXT NOT NULL, counter INTEGER DEFAULT 0, transports TEXT DEFAULT '[]', device_name TEXT, created_at TEXT NOT NULL, last_used_at TEXT);
CREATE TABLE IF NOT EXISTS webauthn_challenges (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, challenge TEXT NOT NULL, purpose TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS file_versions (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, version INTEGER NOT NULL, stored_name TEXT NOT NULL, size INTEGER NOT NULL, checksum TEXT NOT NULL, uploaded_by TEXT REFERENCES users(id), created_at TEXT NOT NULL, UNIQUE(document_id,version));
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type,entity_id,occurred_at);
CREATE INDEX IF NOT EXISTS idx_calendar_range ON calendar_events(start_at,end_at);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approval_requests(status,assigned_role);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id,status);
CREATE INDEX IF NOT EXISTS idx_integration_jobs ON integration_jobs(status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_monitoring_unresolved ON monitoring_events(resolved_at,level,created_at);

INSERT OR IGNORE INTO business_settings(key,value,category,updated_at) VALUES
('company_name','GREECE Maintenance & Staffing Ltd.','identity',datetime('now')),
('company_number','516789432','identity',datetime('now')),
('phone','03-555-0188','contact',datetime('now')),
('email','greece.maintenance.servicese.ltd@gmail.com','contact',datetime('now')),
('address','18 HaMasger Street, Tel Aviv-Yafo, Israel','contact',datetime('now')),
('hours','Sun-Thu 08:00-18:00','contact',datetime('now')),
('vat_rate','17','finance',datetime('now')),
('currency','ILS','finance',datetime('now')),
('invoice_prefix','GR-INV','finance',datetime('now')),
('lead_sla_hours','4','crm',datetime('now')),
('privacy_email','privacy@greece-ltd.co.il','legal',datetime('now'));

INSERT OR IGNORE INTO provider_integrations(id,provider,category,mode,status,settings,created_at,updated_at) VALUES
('provider-whatsapp','whatsapp','communication','sandbox','sandbox','{"templates":true}',datetime('now'),datetime('now')),
('provider-accounting','israeli_accounting','finance','sandbox','sandbox','{"vat":true}',datetime('now'),datetime('now')),
('provider-payments','payments','finance','sandbox','sandbox','{"currency":"ILS"}',datetime('now'),datetime('now')),
('provider-storage','object_storage','files','local','connected','{"driver":"local"}',datetime('now'),datetime('now')),
('provider-monitoring','monitoring','operations','local','connected','{"driver":"database"}',datetime('now'),datetime('now'));

INSERT OR IGNORE INTO employees(id,employee_number,full_name,email,phone,position,salary,status,hire_date,vacation_days,sick_days,created_at,updated_at)
VALUES('employee-admin-demo','EMP-ADMIN','System Administrator','admin@greece.co.il','050-555-0188','Business Administrator',18000,'active','2025-01-01',18,12,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO automation_rules(id,name,entity_type,trigger_event,conditions,actions,active,created_at,updated_at) VALUES
('automation-hot-lead','Hot lead follow-up','lead','lead.created','{"score_gte":70}','[{"type":"task","title":"Contact hot lead","due_hours":2},{"type":"notification","title":"Hot lead requires attention"}]',1,datetime('now'),datetime('now')),
('automation-stale-lead','Stale lead reminder','lead','scheduled.daily','{"inactive_days":3}','[{"type":"task","title":"Follow up stale lead","due_hours":24}]',1,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO calendar_events(id,title,event_type,start_at,end_at,location,description,customer_id,assigned_to,status,created_at,updated_at)
SELECT 'calendar-demo-meeting','Quarterly service review','meeting',datetime('now','+2 days'),datetime('now','+2 days','+1 hour'),'Alpha Industries - Tel Aviv','Review KPIs, staffing and maintenance plan',c.id,u.id,'scheduled',datetime('now'),datetime('now') FROM customers c CROSS JOIN users u ORDER BY c.created_at,u.created_at LIMIT 1;

INSERT OR IGNORE INTO notifications(id,user_id,type,title,message,link,created_at,updated_at)
SELECT 'notification-welcome',id,'system','Business OS is ready','Review provider settings and generated company information.','/crm#settings',datetime('now'),datetime('now') FROM users ORDER BY created_at LIMIT 1;

INSERT OR IGNORE INTO approval_requests(id,entity_type,entity_id,action,requested_by,assigned_role,status,amount,reason,created_at,updated_at)
SELECT 'approval-demo-supplier','transaction',NULL,'Approve new service supplier',id,'administrator','pending',12500,'Generated approval example for the new workflow',datetime('now'),datetime('now') FROM users ORDER BY created_at LIMIT 1;
