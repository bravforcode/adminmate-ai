# Phase 7F — Soft Launch Execution Kit

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE

---

## 1. Beta User Invitation Template

### Email Template (Thai)

**Subject**: 🚀 ทดสอบ AdminMate AI — ระบบ HR สำหรับ SME

---

สวัสดีค่ะ [ชื่อ],

AdminMate AI พร้อมให้ทดสอบแล้ว! 🎉

เราขอเชิญคุณเป็นหนึ่งใน beta users แรกๆ ของระบบ HR ที่ออกแบบมาสำหรับ SME ชาวไทย

**สิ่งที่คุณจะได้ทดลอง:**
- ✅ จัดการผู้สมัครงานแบบ all-in-one
- ✅ AI ช่วยเขียน JD, screen Resume, ทำ Offer
- ✅ E-signature สำหรับเอกสารสำคัญ
- ✅ PDPA compliance tools
- ✅ Dashboard สำหรับ HR และ Applicant

**ข้อมูลสำคัญ:**
- 🌐 URL: https://adminmate-ai.vercel.app
- 📧 Email: [email ของผู้ใช้]
- 🔑 Password: [password ชั่วคราว]
- ⏰ หมดอายุ: [วันที่]

**ข้อจำกัด (Beta):**
- จำกัด 1 HR user, 50 พนักงาน, 1 ตำแหน่งงาน, 5 ผู้สมัคร
- 10 AI messages ต่อเดือน
- ไม่มี E-signature และ PDPA tools (ต้องอัปเกรด)

**ข้อเสนอแนะ:**
กรุณาตอบกลับอีเมลนี้หรือกรอกแบบฟอร์ม feedback:
https://forms.gle/[FORM_ID]

ขอบคุณค่ะ! 🙏

ทีม AdminMate AI
support@adminmate-ai.com

---

### Email Template (English)

**Subject**: 🚀 Test AdminMate AI — HR Software for SMEs

---

Hi [Name],

AdminMate AI is ready for testing! 🎉

We'd like to invite you as one of our first beta users for an HR platform designed for Thai SMEs.

**What you'll try:**
- ✅ All-in-one candidate management
- ✅ AI-powered JD writing, resume screening, offer letters
- ✅ E-signature for important documents
- ✅ PDPA compliance tools
- ✅ Dashboards for HR and applicants

**Important info:**
- 🌐 URL: https://adminmate-ai.vercel.app
- 📧 Email: [user email]
- 🔑 Password: [temporary password]
- ⏰ Expires: [date]

**Beta limitations:**
- 1 HR user, 50 employees, 1 job posting, 5 candidates
- 10 AI messages per month
- No e-signature or PDPA tools (upgrade required)

**Feedback:**
Please reply to this email or fill out the feedback form:
https://forms.gle/[FORM_ID]

Thank you! 🙏

The AdminMate AI Team
support@adminmate-ai.com

---

## 2. Founder Script (Demo Call)

### Opening (30 seconds)
"สวัสดีค่ะ ขอบคุณที่สนใจ AdminMate AI วันนี้จะ-demo ระบบสั้นๆ ให้ดูนะคะ システムは HR สำหรับ SME ชาวไทย ที่ช่วยลดงาน admin แล้วก็ใช้ AI ช่วยทำงานหลายอย่าง"

### Key Features Demo (5 minutes)
1. **Dashboard** — ดูภาพรวมของทีม, ตำแหน่งงาน, ผู้สมัคร
2. **Job Posting** — AI ช่วยเขียน JD (demo: ใส่ชื่อตำแหน่ง → AI สร้าง JD)
3. **Resume Screening** — upload resume → AI screen → ให้คะแนน
4. **Offer Letter** — AI สร้าง offer ตาม template
5. **E-signature** — ส่งเอกสารให้เซ็นออนไลน์
6. **PDPA** — export/delete data ตาม PDPA

### Pricing (1 minute)
- **Free**: ฟรี, 1 HR, 50 พนักงาน, 10 AI messages/เดือน
- **Growth**: ฿2,900/เดือน, 5 HR, 500 พนักงาน, 100 AI messages/เดือน
- **Pro**: ฿7,900/เดือน, 20 HR, unlimited

### Closing (30 seconds)
"ถ้าสนใจ สมัคร beta ได้เลยค่ะ ตอนนี้ยังฟรี ไม่มีบัตรเครดิต ถ้ามีคำถามอะไร ถามได้เลยค่ะ"

---

## 3. Feedback Form Structure

### Google Forms / Tally

**Questions:**
1. ชื่อ / Name (text)
2. บริษัท / Company (text)
3. ขนาดทีม / Team size (dropdown: 1-10, 11-50, 51-200, 200+)
4. ใช้ features ไหนบ้าง? / Which features did you use? (checkbox: Dashboard, Job Posting, Resume Screening, Offer Letter, E-signature, PDPA, Reports)
5. ชอบอะไรมากที่สุด? / What did you like most? (textarea)
6. มีปัญหาอะไร? / Any issues? (textarea)
7. อยากให้เพิ่มอะไร? / What features would you like? (textarea)
8. ให้คะแนน 1-5 / Rate 1-5 (rating)
9. จะแนะนำเพื่อนไหม? / Would you recommend? (Yes/No/Maybe)
10. อีเมลสำหรับติดต่อ / Contact email (text, optional)

---

## 4. Triage Board Setup

### GitHub Projects (Recommended)

**Columns:**
1. **New** — Issues/feedback ที่เพิ่งเข้ามา
2. **Triaged** — ตรวจสอบแล้ว, กำหนด severity
3. **In Progress** — กำลังแก้ไข
4. **Done** — แก้ไขแล้ว
5. **Won't Fix** — ไม่แก้ (ด้วยเหตุผล)

**Labels:**
- `bug` — ข้อผิดพลาด
- `feature-request` — ขอ features ใหม่
- `ux-issue` — ปัญหาด้าน UX
- `p0-critical` — ต้องแก้ทันที
- `p1-high` — ต้องแก้ภายใน 24 ชม.
- `p2-medium` — ต้องแก้ภายในสัปดาห์
- `p3-low` — แก้เมื่อมีเวลา

### Alternative: Notion / Trello

ใช้ Kanban board เหมือนกัน แต่ไม่มี built-in labels

---

## 5. Daily Monitoring Checklist

### Morning (9:00 AM)
- [ ] Check Sentry errors (https://sentry.io)
- [ ] Check uptime status (https://betterstack.com)
- [ ] Check Supabase dashboard (https://supabase.com/dashboard)
- [ ] Review new feedback/submissions

### Afternoon (2:00 PM)
- [ ] Check E2E test results
- [ ] Review any new issues on GitHub
- [ ] Respond to user feedback

### Evening (6:00 PM)
- [ ] Summary of day's issues
- [ ] Update triage board
- [ ] Plan next day's fixes

---

## 6. Rollback Criteria

### Automatic Rollback Triggers
- Error rate > 10% for 5 minutes
- Database connection failures > 3 in 5 minutes
- Health check failing for > 10 minutes

### Manual Rollback Steps
1. Disable billing page: remove `/settings/billing` route
2. Revert to free tier: `UPDATE companies SET subscription_status = 'free'`
3. Disable Stripe webhook: remove webhook endpoint in Stripe Dashboard
4. Notify users: send email about temporary maintenance

---

## 7. Success Metrics (First 7 Days)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Beta signups | 10+ | Database count |
| Active users | 5+ | Login count |
| Feedback submissions | 5+ | Form responses |
| Critical bugs | 0 | Sentry/GitHub |
| Uptime | 99%+ | Better Stack |
| NPS score | 30+ | Feedback form |

---

## 8. Communication Channels

| Channel | Purpose | Link |
|---------|---------|------|
| Email | User support | support@adminmate-ai.com |
| GitHub | Issue tracking | https://github.com/bravforcode/adminmate-ai/issues |
| Line群组 | Thai users | [Create group] |
| Slack | Internal team | [Create workspace] |
