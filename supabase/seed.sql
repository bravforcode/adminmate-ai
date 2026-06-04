-- Idempotent seed data for AdminMate AI
-- Run with: psql using service-role connection (db push or supabase db reset)
-- Test user: testlogin99@gmail.com (auth.users.id: a07ac229-65da-488a-a2e5-0aeec1474510)

SET search_path = public;

-- ============== COMPANY ==============
INSERT INTO companies (id, name, name_th, industry, country, currency, timezone, locale, email, phone, city, subscription_tier, max_employees)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'AdminMate Demo Co., Ltd.',
  'แอดมินเมท เดโม จำกัด',
  'technology',
  'TH',
  'THB',
  'Asia/Bangkok',
  'th-TH',
  'demo@adminmate-ai.com',
  '+66-2-123-4567',
  'Bangkok',
  'pro',
  100
)
ON CONFLICT (id) DO NOTHING;

-- ============== USER PROFILE (test user becomes company admin) ==============
INSERT INTO user_profiles (id, email, full_name, full_name_th, role, company_id, is_active, language_preference)
VALUES (
  'a07ac229-65da-488a-a2e5-0aeec1474510',
  'testlogin99@gmail.com',
  'Test Admin',
  'ผู้ดูแลทดสอบ',
  'admin',
  '11111111-1111-1111-1111-111111111111',
  true,
  'en'
)
ON CONFLICT (id) DO UPDATE
SET company_id = EXCLUDED.company_id,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = NOW();

-- ============== JOBS (5 total: 3 open/active, 1 draft, 1 closed) ==============
INSERT INTO jobs (id, company_id, created_by, title, title_th, department, location, employment_type, experience_level, status, headcount, filled_count, salary_min, salary_max, salary_currency, skills_required, description, description_th, responsibilities, requirements, application_deadline) VALUES
('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a07ac229-65da-488a-a2e5-0aeec1474510', 'Senior Frontend Developer', 'นักพัฒนา Frontend อาวุโส', 'Engineering', 'Bangkok', 'full_time', 'senior', 'active', 2, 0, 80000, 140000, 'THB', ARRAY['React','TypeScript','Tailwind','Next.js'], 'Build modern HR web apps using React and TypeScript.', 'พัฒนาเว็บแอปพลิเคชัน HR สมัยใหม่ด้วย React และ TypeScript', ARRAY['Design and implement UI components','Mentor junior developers','Review pull requests'], ARRAY['5+ years React experience','Strong TypeScript','English communication'], '2026-12-31'),
('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a07ac229-65da-488a-a2e5-0aeec1474510', 'Backend Engineer (Node.js)', 'วิศวกร Backend (Node.js)', 'Engineering', 'Bangkok', 'full_time', 'mid', 'active', 1, 0, 60000, 100000, 'THB', ARRAY['Node.js','PostgreSQL','Supabase','REST'], 'Build scalable APIs and data pipelines.', 'สร้าง API ที่ปรับขนาดได้และ data pipeline', ARRAY['Design REST APIs','Optimize queries','Write tests'], ARRAY['3+ years Node.js','Strong SQL','Supabase experience'], '2026-09-30'),
('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a07ac229-65da-488a-a2e5-0aeec1474510', 'HR Business Partner', 'พันธมิตรธุรกิจ HR', 'People', 'Bangkok', 'full_time', 'senior', 'active', 1, 0, 70000, 110000, 'THB', ARRAY['HR','Recruitment','Onboarding','Labor Law'], 'Partner with engineering to scale the team.', 'ทำงานร่วมกับทีมวิศวกรรมเพื่อขยายทีม', ARRAY['Run recruitment cycle','Build onboarding','Advise on labor law'], ARRAY['5+ years HRBP','Strong English','PDPA knowledge'], '2026-08-31'),
('22222222-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a07ac229-65da-488a-a2e5-0aeec1474510', 'Product Designer', 'นักออกแบบผลิตภัณฑ์', 'Design', 'Bangkok', 'full_time', 'mid', 'draft', 1, 0, 50000, 90000, 'THB', ARRAY['Figma','UI/UX','Design Systems'], 'Design beautiful, accessible interfaces.', 'ออกแบบ UI ที่สวยงามและเข้าถึงได้', ARRAY['Create wireframes','Maintain design system','Usability tests'], ARRAY['3+ years product design','Strong Figma','Portfolio'], NULL),
('22222222-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'a07ac229-65da-488a-a2e5-0aeec1474510', 'DevOps Engineer', 'วิศวกร DevOps', 'Engineering', 'Remote', 'full_time', 'senior', 'closed', 1, 1, 90000, 150000, 'THB', ARRAY['Kubernetes','AWS','Terraform','CI/CD'], 'Closed role (already filled).', 'ปิดรับสมัครแล้ว (เติมตำแหน่งแล้ว)', ARRAY['Manage infrastructure','Automate deployments'], ARRAY['5+ years DevOps','AWS certified','Terraform experience'], '2025-06-30')
ON CONFLICT (id) DO NOTHING;

-- ============== CANDIDATES (20) ==============
INSERT INTO candidates (id, company_id, full_name, full_name_th, email, phone, location, current_position, experience_years, source, preferred_language) VALUES
('33333333-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Somchai Jaidee','สมชาย ใจดี','somchai.j@example.com','+66-81-111-0001','Bangkok','Frontend Developer',4.5,'linkedin','th'),
('33333333-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Suda Rakdee','สุดา รักดี','suda.r@example.com','+66-81-111-0002','Bangkok','Backend Developer',3.0,'direct','th'),
('33333333-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Anan Wongthong','อนันต์ วงศ์ทอง','anan.w@example.com','+66-81-111-0003','Chiang Mai','Full Stack Developer',6.0,'referral','th'),
('33333333-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Nattaya Suksawat','นาตยา สุขสวัสดิ์','nattaya.s@example.com','+66-81-111-0004','Bangkok','UX Designer',5.0,'job_portal','th'),
('33333333-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Pichet Klinhom','พิเชษฐ์ กลิ่นหอม','pichet.k@example.com','+66-81-111-0005','Phuket','HR Manager',8.0,'linkedin','th'),
('33333333-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Wanida Chaiyaporn','วนิดา ไชยพร','wanida.c@example.com','+66-81-111-0006','Bangkok','DevOps Engineer',4.0,'direct','th'),
('33333333-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','Kornkrit Srisuk','กรกฤช ศรีสุข','kornkrit.s@example.com','+66-81-111-0007','Bangkok','React Developer',2.5,'linkedin','th'),
('33333333-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','Praewa Tansiri','แพรวา ตันศิริ','praewa.t@example.com','+66-81-111-0008','Bangkok','Product Manager',5.5,'referral','th'),
('33333333-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','Chatchai Boonsong','ชาติชาย บุญส่ง','chatchai.b@example.com','+66-81-111-0009','Khon Kaen','QA Engineer',3.0,'job_portal','th'),
('33333333-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','Thanyalak Phromma','ธัญญลักษณ์ พรหมมา','thanyalak.p@example.com','+66-81-111-0010','Bangkok','Data Analyst',2.0,'direct','th'),
('33333333-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','Sarawut Lertkul','สราวุฒิ เลิศกุล','sarawut.l@example.com','+66-81-111-0011','Bangkok','Backend Developer',4.0,'linkedin','th'),
('33333333-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','Pitchayapa Sanguan','พิชญาภา สงวน','pitchayapa.s@example.com','+66-81-111-0012','Chiang Mai','UI Designer',3.5,'job_portal','th'),
('33333333-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','Niran Prasertsuk','นิรันดร์ ประเสริฐสุข','niran.p@example.com','+66-81-111-0013','Bangkok','Senior Frontend',7.0,'referral','th'),
('33333333-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','Wipa Saetan','วิภา แซ่ตัน','wipa.s@example.com','+66-81-111-0014','Bangkok','HR Specialist',2.0,'direct','th'),
('33333333-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','Aekkarat Yodmanee','เอกราช ยอดมณี','aekkarat.y@example.com','+66-81-111-0015','Bangkok','DevOps Engineer',6.0,'linkedin','th'),
('33333333-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','Siriwan Charoen','ศิริวรรณ เจริญ','siriwan.c@example.com','+66-81-111-0016','Bangkok','Frontend Developer',1.5,'job_portal','th'),
('33333333-0000-0000-0000-000000000017','11111111-1111-1111-1111-111111111111','Mana Jitpakdee','มานะ จิตรภักดี','mana.j@example.com','+66-81-111-0017','Phuket','Backend Engineer',3.5,'direct','th'),
('33333333-0000-0000-0000-000000000018','11111111-1111-1111-1111-111111111111','Yupa Wirot','ยุพา วิโรจน์','yupa.w@example.com','+66-81-111-0018','Bangkok','Recruiter',4.0,'referral','th'),
('33333333-0000-0000-0000-000000000019','11111111-1111-1111-1111-111111111111','Tawatchai Suk','ธวัชชัย สุข','tawatchai.s@example.com','+66-81-111-0019','Bangkok','Full Stack Developer',5.0,'linkedin','th'),
('33333333-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','Kannika Boonma','กรรณิการ์ บุญมา','kannika.b@example.com','+66-81-111-0020','Bangkok','HR Coordinator',1.0,'direct','th')
ON CONFLICT (id) DO NOTHING;

-- ============== APPLICATIONS (30: distributed across candidates/jobs/statuses) ==============
INSERT INTO applications (id, job_id, candidate_id, company_id, status, ai_match_score, applied_at, screened_at, shortlisted_at, interviewed_at, offered_at, hired_at, rejected_at) VALUES
('44444444-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','shortlisted',92.5, NOW()-INTERVAL '15 days', NOW()-INTERVAL '14 days', NOW()-INTERVAL '10 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','interviewing',88.0, NOW()-INTERVAL '20 days', NOW()-INTERVAL '19 days', NOW()-INTERVAL '15 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','screening',76.0, NOW()-INTERVAL '5 days', NOW()-INTERVAL '4 days', NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','hired',95.0, NOW()-INTERVAL '40 days', NOW()-INTERVAL '38 days', NOW()-INTERVAL '30 days', NOW()-INTERVAL '20 days', NOW()-INTERVAL '10 days', NOW()-INTERVAL '3 days', NULL),
('44444444-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','applied',65.0, NOW()-INTERVAL '2 days', NULL, NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000019','11111111-1111-1111-1111-111111111111','rejected',45.0, NOW()-INTERVAL '25 days', NOW()-INTERVAL '23 days', NULL, NULL, NULL, NULL, NOW()-INTERVAL '22 days'),
('44444444-0000-0000-0000-000000000007','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','screening',82.0, NOW()-INTERVAL '6 days', NOW()-INTERVAL '5 days', NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000008','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','shortlisted',89.5, NOW()-INTERVAL '12 days', NOW()-INTERVAL '11 days', NOW()-INTERVAL '7 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000009','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000017','11111111-1111-1111-1111-111111111111','interviewing',85.0, NOW()-INTERVAL '18 days', NOW()-INTERVAL '17 days', NOW()-INTERVAL '12 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000010','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','rejected',55.0, NOW()-INTERVAL '30 days', NOW()-INTERVAL '28 days', NULL, NULL, NULL, NULL, NOW()-INTERVAL '27 days'),
('44444444-0000-0000-0000-000000000011','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','applied',60.0, NOW()-INTERVAL '1 day', NULL, NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000012','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','hired',94.0, NOW()-INTERVAL '50 days', NOW()-INTERVAL '48 days', NOW()-INTERVAL '40 days', NOW()-INTERVAL '25 days', NOW()-INTERVAL '15 days', NOW()-INTERVAL '5 days', NULL),
('44444444-0000-0000-0000-000000000013','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','screening',72.0, NOW()-INTERVAL '7 days', NOW()-INTERVAL '6 days', NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000014','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000018','11111111-1111-1111-1111-111111111111','interviewing',87.0, NOW()-INTERVAL '14 days', NOW()-INTERVAL '13 days', NOW()-INTERVAL '9 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000015','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','applied',58.0, NOW()-INTERVAL '3 days', NULL, NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000016','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','rejected',50.0, NOW()-INTERVAL '35 days', NOW()-INTERVAL '33 days', NULL, NULL, NULL, NULL, NOW()-INTERVAL '32 days'),
('44444444-0000-0000-0000-000000000017','22222222-0000-0000-0000-000000000004','33333333-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','shortlisted',90.0, NOW()-INTERVAL '10 days', NOW()-INTERVAL '9 days', NOW()-INTERVAL '5 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000018','22222222-0000-0000-0000-000000000004','33333333-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','screening',78.0, NOW()-INTERVAL '8 days', NOW()-INTERVAL '7 days', NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000019','22222222-0000-0000-0000-000000000004','33333333-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','interviewing',84.0, NOW()-INTERVAL '16 days', NOW()-INTERVAL '15 days', NOW()-INTERVAL '11 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000020','22222222-0000-0000-0000-000000000005','33333333-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','rejected',40.0, NOW()-INTERVAL '60 days', NOW()-INTERVAL '58 days', NULL, NULL, NULL, NULL, NOW()-INTERVAL '55 days'),
('44444444-0000-0000-0000-000000000021','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','screening',70.0, NOW()-INTERVAL '4 days', NOW()-INTERVAL '3 days', NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000022','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','applied',55.0, NOW()-INTERVAL '6 hours', NULL, NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000023','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000019','11111111-1111-1111-1111-111111111111','shortlisted',86.5, NOW()-INTERVAL '11 days', NOW()-INTERVAL '10 days', NOW()-INTERVAL '6 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000024','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','interviewing',91.0, NOW()-INTERVAL '22 days', NOW()-INTERVAL '21 days', NOW()-INTERVAL '17 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000025','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','screening',73.5, NOW()-INTERVAL '9 days', NOW()-INTERVAL '8 days', NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000026','22222222-0000-0000-0000-000000000004','33333333-0000-0000-0000-000000000017','11111111-1111-1111-1111-111111111111','applied',62.0, NOW()-INTERVAL '2 days', NULL, NULL, NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000027','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','shortlisted',83.0, NOW()-INTERVAL '13 days', NOW()-INTERVAL '12 days', NOW()-INTERVAL '8 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000028','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','rejected',48.0, NOW()-INTERVAL '28 days', NOW()-INTERVAL '26 days', NULL, NULL, NULL, NULL, NOW()-INTERVAL '25 days'),
('44444444-0000-0000-0000-000000000029','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','interviewing',88.5, NOW()-INTERVAL '19 days', NOW()-INTERVAL '18 days', NOW()-INTERVAL '14 days', NULL, NULL, NULL, NULL),
('44444444-0000-0000-0000-000000000030','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','shortlisted',89.0, NOW()-INTERVAL '10 days', NOW()-INTERVAL '9 days', NOW()-INTERVAL '5 days', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============== INTERVIEWS (10) ==============
INSERT INTO interviews (id, application_id, company_id, interviewer_name, interviewer_email, interview_type, scheduled_at, duration_minutes, location, meeting_link, status, recommendation) VALUES
('55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Ariya Techavanich','ariya.t@adminmate-ai.com','video',NOW()+INTERVAL '2 days',60,'Zoom','https://meet.example.com/int-001','scheduled',NULL),
('55555555-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Kornkrit Suthep','kornkrit.s@adminmate-ai.com','phone',NOW()+INTERVAL '3 days',45,'Phone',NULL,'scheduled',NULL),
('55555555-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','Ariya Techavanich','ariya.t@adminmate-ai.com','video',NOW()+INTERVAL '1 day',60,'Google Meet','https://meet.example.com/int-003','scheduled',NULL),
('55555555-0000-0000-0000-000000000004','44444444-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','Wanida Phaengma','wanida.p@adminmate-ai.com','onsite','2026-05-20 14:00:00+07',90,'HQ Bangkok',NULL,'completed','hire'),
('55555555-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','Pichet Srisuk','pichet.s@adminmate-ai.com','video',NOW()+INTERVAL '5 days',60,'Zoom','https://meet.example.com/int-005','scheduled',NULL),
('55555555-0000-0000-0000-000000000006','44444444-0000-0000-0000-000000000019','11111111-1111-1111-1111-111111111111','Kornkrit Suthep','kornkrit.s@adminmate-ai.com','video','2026-05-15 10:00:00+07',60,'Zoom','https://meet.example.com/int-006','completed','hire'),
('55555555-0000-0000-0000-000000000007','44444444-0000-0000-0000-000000000023','11111111-1111-1111-1111-111111111111','Ariya Techavanich','ariya.t@adminmate-ai.com','phone',NOW()+INTERVAL '4 days',30,'Phone',NULL,'scheduled',NULL),
('55555555-0000-0000-0000-000000000008','44444444-0000-0000-0000-000000000024','11111111-1111-1111-1111-111111111111','Wanida Phaengma','wanida.p@adminmate-ai.com','video','2026-05-18 15:00:00+07',60,'Google Meet','https://meet.example.com/int-008','completed','hire'),
('55555555-0000-0000-0000-000000000009','44444444-0000-0000-0000-000000000027','11111111-1111-1111-1111-111111111111','Pichet Srisuk','pichet.s@adminmate-ai.com','onsite',NOW()+INTERVAL '6 days',90,'HQ Bangkok',NULL,'scheduled',NULL),
('55555555-0000-0000-0000-000000000010','44444444-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','Kornkrit Suthep','kornkrit.s@adminmate-ai.com','video',NOW()+INTERVAL '7 days',60,'Zoom','https://meet.example.com/int-010','scheduled',NULL)
ON CONFLICT (id) DO NOTHING;

-- ============== OFFERS (5: matching hired applications + accepted offers) ==============
INSERT INTO offers (id, application_id, company_id, candidate_id, job_id, position_title, salary_offered, salary_currency, employment_type, start_date, work_hours, benefits, status, sent_at, responded_at) VALUES
('66666666-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000013','22222222-0000-0000-0000-000000000001','Senior Frontend Developer',130000,'THB','full_time','2026-07-01','09:00-18:00',ARRAY['Health insurance','14 days annual leave','Remote Fridays'],'accepted',NOW()-INTERVAL '10 days',NOW()-INTERVAL '8 days'),
('66666666-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000003','HR Business Partner',105000,'THB','full_time','2026-07-15','09:00-18:00',ARRAY['Health insurance','Annual bonus','WFH 2 days/week'],'accepted',NOW()-INTERVAL '15 days',NOW()-INTERVAL '12 days'),
('66666666-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000011','22222222-0000-0000-0000-000000000002','Backend Engineer',85000,'THB','full_time','2026-07-01','09:00-18:00',ARRAY['Health insurance'],'pending',NOW()-INTERVAL '3 days',NULL),
('66666666-0000-0000-0000-000000000004','44444444-0000-0000-0000-000000000023','11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000019','22222222-0000-0000-0000-000000000002','Senior Backend Engineer',95000,'THB','full_time','2026-08-01','09:00-18:00',ARRAY['Health insurance','WFH'],'pending',NOW()-INTERVAL '2 days',NULL),
('66666666-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','33333333-0000-0000-0000-000000000015','22222222-0000-0000-0000-000000000001','Senior Frontend Developer',125000,'THB','full_time','2026-08-01','09:00-18:00',ARRAY['Health insurance','Annual bonus','WFH 2 days/week'],'draft',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- ============== ONBOARDING CHECKLISTS (10) ==============
-- For accepted offers + a few in-progress checklists tied to test user
INSERT INTO onboarding_checklists (id, company_id, employee_id, offer_id, template_name, status, progress_percentage, start_date, target_completion_date, completed_at) VALUES
('77777777-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510','66666666-0000-0000-0000-000000000001','TH_standard_v1','in_progress',40.0,'2026-06-15','2026-06-30',NULL),
('77777777-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510','66666666-0000-0000-0000-000000000002','TH_standard_v1','in_progress',20.0,'2026-07-01','2026-07-15',NULL),
('77777777-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510',NULL,'TH_standard_v1','in_progress',10.0,'2026-06-01','2026-06-15',NULL),
('77777777-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510',NULL,'TH_standard_v1','in_progress',60.0,'2026-05-15','2026-05-30',NULL),
('77777777-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510',NULL,'TH_standard_v1','completed',100.0,'2026-04-01','2026-04-15','2026-04-14 17:00:00+07'),
('77777777-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510',NULL,'TH_standard_v1','in_progress',0.0,'2026-07-15','2026-07-30',NULL),
('77777777-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510',NULL,'TH_standard_v1','in_progress',80.0,'2026-05-01','2026-05-15',NULL),
('77777777-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510',NULL,'TH_standard_v1','in_progress',30.0,'2026-06-20','2026-07-05',NULL),
('77777777-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510',NULL,'TH_standard_v1','in_progress',15.0,'2026-07-01','2026-07-15',NULL),
('77777777-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','a07ac229-65da-488a-a2e5-0aeec1474510',NULL,'TH_standard_v1','completed',100.0,'2026-03-01','2026-03-15','2026-03-14 16:00:00+07')
ON CONFLICT (id) DO NOTHING;

-- ============== ONBOARDING TASKS (per checklist, subset of TH template) ==============
INSERT INTO onboarding_tasks (id, checklist_id, company_id, task_name, task_name_en, category, timeframe, order_index, is_completed, completed_at) VALUES
('88888888-0000-0000-0000-000000000001','77777777-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','กรอกแบบฟอร์มข้อมูลพนักงาน','Fill employee information form','admin','day_1',0,true,NOW()-INTERVAL '1 day'),
('88888888-0000-0000-0000-000000000002','77777777-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','ส่งสำเนาบัตรประชาชน','Submit ID card copy','admin','day_1',1,true,NOW()-INTERVAL '1 day'),
('88888888-0000-0000-0000-000000000003','77777777-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','ลงทะเบียนประกันสังคม','Register Social Security','admin','day_1',2,true,NOW()-INTERVAL '1 day'),
('88888888-0000-0000-0000-000000000004','77777777-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','แจ้งเลขบัญชีธนาคาร','Submit bank account details','admin','day_1',3,true,NOW()-INTERVAL '1 day'),
('88888888-0000-0000-0000-000000000005','77777777-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','รับอุปกรณ์คอมพิวเตอร์','Receive IT equipment','it','day_1',4,false,NULL),
('88888888-0000-0000-0000-000000000006','77777777-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','กรอกแบบฟอร์มข้อมูลพนักงาน','Fill employee information form','admin','day_1',0,true,NOW()-INTERVAL '1 day'),
('88888888-0000-0000-0000-000000000007','77777777-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','ส่งสำเนาบัตรประชาชน','Submit ID card copy','admin','day_1',1,true,NOW()-INTERVAL '1 day'),
('88888888-0000-0000-0000-000000000008','77777777-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','รับอุปกรณ์คอมพิวเตอร์','Receive IT equipment','it','day_1',2,false,NULL),
('88888888-0000-0000-0000-000000000009','77777777-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','ตั้งค่า Email บริษัท','Setup company email','it','day_1',3,false,NULL),
('88888888-0000-0000-0000-000000000010','77777777-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','เซ็นสัญญาจ้างงาน','Sign employment contract','hr','week_1',4,false,NULL)
ON CONFLICT (id) DO NOTHING;

-- ============== SUBSCRIPTION (free -> pro upgrade for demo) ==============
INSERT INTO subscriptions (id, company_id, tier, max_employees, max_active_jobs, max_ai_calls_per_day, features)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  'pro',
  100,
  20,
  200,
  '{"ai_screening": true, "ai_jd_generation": true, "chat_mate": true, "custom_domain": true}'::jsonb
)
ON CONFLICT (company_id) DO UPDATE
SET tier = EXCLUDED.tier,
    max_employees = EXCLUDED.max_employees,
    max_active_jobs = EXCLUDED.max_active_jobs,
    max_ai_calls_per_day = EXCLUDED.max_ai_calls_per_day,
    features = EXCLUDED.features;

-- ============== Refresh dashboard_stats so first read is accurate ==============
REFRESH MATERIALIZED VIEW dashboard_stats;

-- ============== Verification counts ==============
DO $$
DECLARE
  v_company INT;
  v_jobs INT;
  v_candidates INT;
  v_applications INT;
  v_interviews INT;
  v_offers INT;
  v_checklists INT;
  v_tasks INT;
BEGIN
  SELECT COUNT(*) INTO v_company FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT COUNT(*) INTO v_jobs FROM jobs WHERE company_id = '11111111-1111-1111-1111-111111111111';
  SELECT COUNT(*) INTO v_candidates FROM candidates WHERE company_id = '11111111-1111-1111-1111-111111111111';
  SELECT COUNT(*) INTO v_applications FROM applications WHERE company_id = '11111111-1111-1111-1111-111111111111';
  SELECT COUNT(*) INTO v_interviews FROM interviews WHERE company_id = '11111111-1111-1111-1111-111111111111';
  SELECT COUNT(*) INTO v_offers FROM offers WHERE company_id = '11111111-1111-1111-1111-111111111111';
  SELECT COUNT(*) INTO v_checklists FROM onboarding_checklists WHERE company_id = '11111111-1111-1111-1111-111111111111';
  SELECT COUNT(*) INTO v_tasks FROM onboarding_tasks WHERE company_id = '11111111-1111-1111-1111-111111111111';
  RAISE NOTICE 'SEED COUNTS: company=%, jobs=%, candidates=%, applications=%, interviews=%, offers=%, checklists=%, tasks=%',
    v_company, v_jobs, v_candidates, v_applications, v_interviews, v_offers, v_checklists, v_tasks;
END
$$;
