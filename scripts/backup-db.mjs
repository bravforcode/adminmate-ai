import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Never hardcode the service_role key — it bypasses all RLS.
// Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup-db.mjs
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nickivumteyrezptjggk.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set.');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role');
  process.exit(1);
}

const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// Known tables from migrations
const TABLES = [
  'companies', 'user_profiles', 'jobs', 'candidates', 'applications',
  'interviews', 'offers', 'documents', 'cv_documents', 'onboarding_checklists',
  'onboarding_tasks', 'chat_messages', 'messages', 'notifications',
  'audit_logs', 'ai_usage_log', 'rate_limits', 'user_rate_limits',
  'login_rate_limits', 'subscriptions', 'pdpa_consents', 'chat_platform_connections',
  'leave_types', 'leave_requests', 'leave_balances', 'attendance_records',
  'employee_referrals', 'employee_contracts', 'offboarding_cases',
  'performance_reviews', 'goals', 'engagement_surveys',
  'asset_categories', 'assets', 'expense_claims',
  'compensation_history', 'benefits_enrollments', 'learning_courses',
  'learning_enrollments', 'learning_progress', 'sensitive_field_registry',
  'platform_config', 'feature_flags', 'integration_configs',
  'webhook_events', 'stripe_webhook_events', 'message_queue',
  'report_schedules', 'export_logs', 'notification_preferences',
];

async function fetchAll(table) {
  let allData = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&offset=${offset}&limit=1000&order=created_at`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      if (res.status === 404) return [];
      console.log(`  ${table}: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) break;
    allData = allData.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return allData;
}

async function backup() {
  const BACKUP_DIR = join(process.cwd(), 'backups');
  mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = join(BACKUP_DIR, `adminmate_${timestamp}.json`);

  console.log(`Backing up ${TABLES.length} tables...`);

  const backup = {
    timestamp: new Date().toISOString(),
    project: 'nickivumteyrezptjggk',
    tables: {},
  };

  let totalRows = 0;
  for (const table of TABLES) {
    try {
      const data = await fetchAll(table);
      backup.tables[table] = data;
      totalRows += data.length;
      console.log(`  ${table}: ${data.length} rows`);
    } catch (e) {
      console.log(`  ${table}: ERROR - ${e.message}`);
      backup.tables[table] = [];
    }
  }

  const json = JSON.stringify(backup);
  writeFileSync(backupFile, json);
  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
  console.log(`\nBackup completed: ${backupFile}`);
  console.log(`Total: ${totalRows} rows across ${TABLES.length} tables (${sizeMB} MB)`);
}

backup().catch(e => {
  console.error('Backup failed:', e.message);
  process.exit(1);
});
