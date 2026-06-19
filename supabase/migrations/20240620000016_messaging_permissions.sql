-- Release 5: Messaging RBAC Permissions
-- ============================================================

-- New permissions for messaging
INSERT INTO permissions (id, resource, action, description) VALUES
  ('message_read', 'message', 'read', 'View messages and drafts'),
  ('message_write', 'message', 'write', 'Create and edit message drafts'),
  ('message_approve', 'message', 'approve', 'Approve or reject message drafts'),
  ('message_send', 'message', 'send', 'Send approved messages'),
  ('message_template_read', 'message_template', 'read', 'View message templates'),
  ('message_template_write', 'message_template', 'write', 'Create and edit message templates'),
  ('message_log_read', 'message_log', 'read', 'View message send logs')
ON CONFLICT (id) DO NOTHING;

-- Role mapping
-- owner: all
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('owner', 'message_read'), ('owner', 'message_write'), ('owner', 'message_approve'),
  ('owner', 'message_send'), ('owner', 'message_template_read'), ('owner', 'message_template_write'),
  ('owner', 'message_log_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- admin: all
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('admin', 'message_read'), ('admin', 'message_write'), ('admin', 'message_approve'),
  ('admin', 'message_send'), ('admin', 'message_template_read'), ('admin', 'message_template_write'),
  ('admin', 'message_log_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- hr_manager: full messaging
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('hr_manager', 'message_read'), ('hr_manager', 'message_write'), ('hr_manager', 'message_approve'),
  ('hr_manager', 'message_send'), ('hr_manager', 'message_template_read'), ('hr_manager', 'message_template_write'),
  ('hr_manager', 'message_log_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- hr_staff: read/write/template_read, can request approval
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('hr_staff', 'message_read'), ('hr_staff', 'message_write'),
  ('hr_staff', 'message_template_read'), ('hr_staff', 'message_log_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- recruiter: read/write/template_read, can request approval
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('recruiter', 'message_read'), ('recruiter', 'message_write'),
  ('recruiter', 'message_template_read'), ('recruiter', 'message_log_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- manager: read only
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('manager', 'message_read'), ('manager', 'message_template_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- employee: read own in-app only (limited by RLS)
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('employee', 'message_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- auditor: log read only
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('auditor', 'message_log_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;
