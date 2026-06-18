# Phase 5G — Soft Launch / Beta User Runbook

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE  

---

## 1. Beta User Criteria

| Criterion | Details |
|-----------|---------|
| Company size | 5–50 employees |
| HR team size | 1–5 people |
| Country | Thailand (primary), Vietnam, Indonesia |
| Use case | Active hiring, onboarding, or document management |
| Tech comfort | Can use web apps without hand-holding |
| Feedback willingness | Willing to provide structured feedback |
| NDA | Not required for beta |
| Exclusion | No competitors, no agencies, no resellers |

**Target**: 10–20 beta companies in first 30 days

---

## 2. Onboarding Script

### First Contact (Email/LINE)
```
Subject: Welcome to AdminMate AI Beta

Hi [Name],

Thanks for joining the AdminMate AI beta! Here's how to get started:

1. Go to [adminmate-ai.vercel.app](https://adminmate-ai.vercel.app)
2. Click "Start Free" and create your account
3. Complete the company setup (2 minutes)
4. Take the product tour (optional, 3 minutes)
5. Post your first job or add your first candidate

Need help? Reply to this message or use the in-app chat.

We'd love your feedback — what works, what doesn't, what's missing.
```

### Day 1 Check-in
```
Hi [Name], how's it going with AdminMate AI so far? Any questions or issues?
```

### Day 7 Check-in
```
Hi [Name], you've been using AdminMate AI for a week. We'd love to hear:
- What's working well?
- What's frustrating?
- What feature is missing?
- Would you recommend this to other HR teams?
```

---

## 3. Feedback Form

### In-App Feedback Widget
- Trigger: "Give Feedback" button in header
- Fields:
  - Category: Bug / Feature Request / General
  - Rating: 1–5 stars
  - Description: Free text
  - Screenshot: Optional

### Post-Onboarding Survey (Day 7)
1. How easy was it to get started? (1–5)
2. Which feature do you use most?
3. Which feature is missing?
4. How does this compare to your current HR tools?
5. Would you pay for this? At what price?
6. Any other feedback?

---

## 4. Issue Triage Process

### Severity Definitions

| Severity | Definition | Response Time | Resolution Target |
|----------|-----------|---------------|-------------------|
| **P0 — Critical** | Data loss, security breach, complete outage | 1 hour | 4 hours |
| **P1 — High** | Core feature broken, no workaround | 4 hours | 24 hours |
| **P2 — Medium** | Feature broken with workaround, UI bug | 24 hours | 72 hours |
| **P3 — Low** | Cosmetic issue, minor inconvenience | 72 hours | Next release |

### Triage Workflow
1. User reports issue (in-app chat, email, or form)
2. Log in issue tracker (Notion, GitHub Issues, or similar)
3. Assign severity based on definitions above
4. P0/P1: Immediate response, escalate to dev team
5. P2/P3: Queue for next sprint
6. Communicate status to user within SLA

---

## 5. Daily Monitoring Checklist

| Check | Frequency | Owner | Tool |
|-------|-----------|-------|------|
| Error rate | Daily | Dev | Sentry / Logs |
| Registration count | Daily | PM | Supabase Dashboard |
| Company setup completion | Daily | PM | Supabase Dashboard |
| Active users | Daily | PM | Supabase Dashboard |
| Support tickets | Daily | Support | In-app chat |
| Page load performance | Daily | Dev | Vercel Analytics |
| Database size | Weekly | DevOps | Supabase Dashboard |
| Edge function errors | Daily | Dev | Supabase Logs |
| Billing issues | Daily | PM | Stripe Dashboard |

---

## 6. Rollback Criteria

| Trigger | Action |
|---------|--------|
| >5 P0 bugs in 24 hours | Pause beta, notify all users |
| Data loss reported | Immediate investigation, rollback if needed |
| Security breach suspected | Immediate investigation, disable affected features |
| >50% of users reporting same bug | Priority fix, communicate timeline |
| Performance degradation >50% | Investigate, rollback if needed |

---

## 7. Support Response Templates

### Bug Report Acknowledgment
```
Hi [Name],

Thanks for reporting this. We've logged it as a [P0/P1/P2/P3] issue and our team is looking into it.

We'll update you within [SLA timeframe]. In the meantime, [workaround if available].

— AdminMate AI Support
```

### Feature Request
```
Hi [Name],

Thanks for the suggestion! We've added it to our roadmap.

[If building]: We're planning to ship this in [timeframe].
[If not building yet]: We'll consider this for a future release. Is there a workaround you're using now?

— AdminMate AI Support
```

### Outage Notification
```
Hi [Name],

We're experiencing an issue with [feature]. Our team is investigating.

Expected resolution: [timeframe]
Workaround: [if available]

We'll update you when this is resolved.

— AdminMate AI Support
```

---

## 8. Metrics Dashboard Plan

### Key Metrics to Track

| Metric | Definition | Target |
|--------|-----------|--------|
| Registration completion rate | % of visitors who complete registration | >30% |
| Company setup completion rate | % of registered users who complete setup | >70% |
| First job created | % of users who create a job within 7 days | >50% |
| First candidate added | % of users who add a candidate within 7 days | >40% |
| First document uploaded | % of users who upload a document within 14 days | >30% |
| Chat opened | % of users who open AI chat within 7 days | >50% |
| D1 retention | % of users who return day after registration | >40% |
| D7 retention | % of users who return 7 days after registration | >20% |
| Critical bug count | P0/P1 bugs per week | <3 |
| Support tickets | Total tickets per week | <10 |

### Dashboard Tools
- **Primary**: Supabase Dashboard (user metrics, queries)
- **Secondary**: Vercel Analytics (page views, performance)
- **Future**: PostHog (funnel analytics, events)
