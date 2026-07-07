-- RELEASE 1 — Task 3: Permission Seed
-- Baseline roles and permissions for AdminMate AI.

-- ============== ROLES ==============
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
  ('owner',            'Owner',               'Full organization owner, billing, settings, final authority', true),
  ('admin',            'Admin',               'Organization admin with broad access', true),
  ('hr_manager',       'HR Manager',          'HR operations owner', true),
  ('hr_staff',         'HR Staff',            'Day-to-day HR operations', true),
  ('recruiter',        'Recruiter',           'Recruiting operations', true),
  ('manager',          'Manager',             'Team management, approvals, performance, leave', true),
  ('employee',         'Employee',            'Self-service portal user', true),
  ('candidate',        'Candidate',           'Application portal user', true),
  ('finance_approver', 'Finance / Payroll Approver', 'Payroll and financial approval', true),
  ('auditor',          'Auditor',             'Read-only, time-boxed, heavily audited access', true);

-- ============== PERMISSIONS ==============
-- Resource-based permissions: resource + action
INSERT INTO permissions (resource, action, display_name) VALUES
  -- Candidate management
  ('candidate', 'read',    'View candidates'),
  ('candidate', 'write',   'Create/edit candidates'),
  ('candidate', 'delete',  'Delete candidates'),
  ('candidate', 'export',  'Export candidate data'),

  -- Job management
  ('job', 'read',    'View jobs'),
  ('job', 'write',   'Create/edit jobs'),
  ('job', 'delete',  'Delete jobs'),
  ('job', 'export',  'Export job data'),

  -- Application management
  ('application', 'read',    'View applications'),
  ('application', 'write',   'Create/edit applications'),
  ('application', 'delete',  'Delete applications'),

  -- Interview management
  ('interview', 'read',    'View interviews'),
  ('interview', 'write',   'Schedule/edit interviews'),
  ('interview', 'delete',  'Cancel interviews'),

  -- Offer management
  ('offer', 'read',    'View offers'),
  ('offer', 'write',   'Create/edit offers'),
  ('offer', 'approve', 'Approve offers'),

  -- Onboarding
  ('onboarding', 'read',   'View onboarding checklists'),
  ('onboarding', 'write',  'Manage onboarding tasks'),
  ('onboarding', 'approve','Approve onboarding completion'),

  -- Documents
  ('document', 'read',   'View documents'),
  ('document', 'write',  'Upload/edit documents'),
  ('document', 'delete', 'Delete documents'),
  ('document', 'export', 'Export documents'),

  -- Employee / HRIS
  ('employee', 'read',    'View employee directory'),
  ('employee', 'write',   'Edit employee profiles'),
  ('employee', 'approve', 'Approve profile changes'),

  -- Payroll
  ('payroll', 'read',    'View payroll data'),
  ('payroll', 'write',   'Process payroll'),
  ('payroll', 'approve', 'Approve payroll runs'),
  ('payroll', 'export',  'Export payroll data'),

  -- Attendance & Leave
  ('attendance', 'read',   'View attendance'),
  ('attendance', 'write',  'Manage attendance'),
  ('leave', 'read',        'View leave requests'),
  ('leave', 'write',       'Request/approve leave'),

  -- Settings
  ('settings', 'read',   'View settings'),
  ('settings', 'write',  'Modify settings'),

  -- Audit log
  ('audit_log', 'read',   'View audit logs'),
  ('audit_log', 'export', 'Export audit logs'),

  -- Analytics & Reports
  ('report', 'read',   'View reports'),
  ('report', 'export', 'Export reports'),

  -- Billing
  ('billing', 'read',   'View billing'),
  ('billing', 'write',  'Manage subscription'),

  -- Compliance
  ('compliance', 'read',   'View compliance data'),
  ('compliance', 'write',  'Manage compliance'),
  ('compliance', 'export', 'Export compliance data'),

  -- AI features
  ('ai', 'use', 'Use AI features');

-- ============== ROLE-PERMISSION MAPPING ==============
-- Owner gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner';

-- Admin gets everything except billing-specific
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource != 'billing';

-- HR Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource IN (
  'candidate', 'job', 'application', 'interview', 'offer',
  'onboarding', 'document', 'employee', 'leave', 'attendance',
  'audit_log', 'report', 'compliance', 'ai'
) AND p.action IN ('read', 'write', 'approve');

-- HR Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource IN (
  'candidate', 'job', 'application', 'interview', 'offer',
  'onboarding', 'document', 'employee', 'leave', 'attendance',
  'report', 'ai'
) AND p.action IN ('read', 'write');

-- Recruiter
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'recruiter' AND p.resource IN (
  'candidate', 'job', 'application', 'interview', 'document', 'ai'
) AND p.action IN ('read', 'write');

-- Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource IN (
  'employee', 'leave', 'attendance', 'report', 'onboarding', 'interview'
) AND p.action IN ('read', 'write', 'approve');

-- Employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource IN (
  'document', 'leave', 'attendance'
) AND p.action IN ('read', 'write');

-- Candidate
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'candidate' AND p.resource IN (
  'application', 'document'
) AND p.action IN ('read', 'write');

-- Finance Approver
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'finance_approver' AND p.resource IN (
  'payroll', 'report', 'billing'
) AND p.action IN ('read', 'approve', 'export');

-- Auditor (read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.action = 'read';
