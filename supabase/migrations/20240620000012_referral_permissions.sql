-- Release 2: Referral RBAC Permissions
-- ============================================================

-- New permissions for referrals
INSERT INTO permissions (id, resource, action, description) VALUES
  ('referral_read', 'referral', 'read', 'View referrals in company'),
  ('referral_write', 'referral', 'write', 'Create and edit referrals'),
  ('referral_delete', 'referral', 'delete', 'Delete referrals'),
  ('referral_manage', 'referral', 'manage', 'Manage referral bonuses and status')
ON CONFLICT (id) DO NOTHING;

-- Role mapping
-- owner: full access
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('owner', 'referral_read'), ('owner', 'referral_write'), ('owner', 'referral_delete'), ('owner', 'referral_manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- admin: full access
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('admin', 'referral_read'), ('admin', 'referral_write'), ('admin', 'referral_delete'), ('admin', 'referral_manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- hr_manager: full access
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('hr_manager', 'referral_read'), ('hr_manager', 'referral_write'), ('hr_manager', 'referral_manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- hr_staff: read + write
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('hr_staff', 'referral_read'), ('hr_staff', 'referral_write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- manager: read + write (can refer their team)
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('manager', 'referral_read'), ('manager', 'referral_write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- employee: read + write (can refer, view own referrals)
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('employee', 'referral_read'), ('employee', 'referral_write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- auditor: read only
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('auditor', 'referral_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;
