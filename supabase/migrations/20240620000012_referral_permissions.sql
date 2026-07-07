-- Release 2: Referral RBAC Permissions
-- Fixed: permissions.id is UUID, cannot use string IDs
-- ============================================================

-- New permissions for referrals (no explicit id — let gen_random_uuid work)
INSERT INTO permissions (resource, action, description) VALUES
  ('referral', 'read', 'View referrals in company'),
  ('referral', 'write', 'Create and edit referrals'),
  ('referral', 'delete', 'Delete referrals'),
  ('referral', 'manage', 'Manage referral bonuses and status')
ON CONFLICT (resource, action) DO NOTHING;

-- Role mapping using subquery to find permission UUIDs
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('owner', 'admin') AND p.resource = 'referral' AND p.action IN ('read', 'write', 'delete', 'manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'referral' AND p.action IN ('read', 'write', 'manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('hr_staff', 'recruiter') AND p.resource = 'referral' AND p.action IN ('read', 'write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'referral' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'referral' AND p.action IN ('read', 'write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource = 'referral' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
