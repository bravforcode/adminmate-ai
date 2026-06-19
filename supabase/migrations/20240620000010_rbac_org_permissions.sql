-- RELEASE 1B — RBAC Permissions for Legal Entity + Org Structure
-- Insert permissions, then map to roles.

-- ============== PERMISSIONS ==============
INSERT INTO permissions (resource, action, display_name) VALUES
  -- Legal entity
  ('legal_entity', 'read',   'View legal entities'),
  ('legal_entity', 'write',  'Create/edit legal entities'),
  ('legal_entity', 'delete', 'Delete legal entities'),

  -- Org structure (business units, departments, teams, reporting lines)
  ('org_structure', 'read',   'View org structure'),
  ('org_structure', 'write',  'Manage org structure'),
  ('org_structure', 'delete', 'Delete org structure'),

  -- Location
  ('location', 'read',   'View locations'),
  ('location', 'write',  'Create/edit locations'),
  ('location', 'delete', 'Delete locations'),

  -- Cost center
  ('cost_center', 'read',   'View cost centers'),
  ('cost_center', 'write',  'Create/edit cost centers'),
  ('cost_center', 'delete', 'Delete cost centers');

-- ============== ROLE MAPPING ==============
-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource IN ('legal_entity', 'org_structure', 'location', 'cost_center');

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource IN ('legal_entity', 'org_structure', 'location', 'cost_center');

-- HR Manager: read/write org structure, read legal entity
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND (
  (p.resource = 'legal_entity' AND p.action = 'read')
  OR (p.resource = 'org_structure' AND p.action IN ('read', 'write'))
  OR (p.resource = 'location' AND p.action IN ('read', 'write'))
  OR (p.resource = 'cost_center' AND p.action IN ('read', 'write'))
);

-- HR Staff: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.action = 'read'
  AND p.resource IN ('legal_entity', 'org_structure', 'location', 'cost_center');

-- Manager: read only (own reporting structure)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.action = 'read'
  AND p.resource IN ('org_structure', 'location');

-- Auditor: read only everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.action = 'read'
  AND p.resource IN ('legal_entity', 'org_structure', 'location', 'cost_center');
