# Release 26F.6 — Calendar and Interview Scheduling

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. Calendar Service

### Service Location

`src/services/calendarService.ts`

### Capabilities

| Feature | Status | Notes |
|---------|--------|-------|
| ICS file generation | ✅ Implemented | Client-side `.ics` file creation |
| Google Calendar deep link | � Implemented | URL-based event creation |
| Outlook Web deep link | ✅ Implemented | URL-based event creation |
| Bulk calendar export | ✅ Implemented | Multiple interviews in one `.ics` |
| Google Calendar API sync | Planned | OAuth + Push notifications |
| Microsoft Graph API sync | Planned | OAuth + Subscriptions |

---

## 2. Interview Calendar Integration

### ICS Generation Flow

```
1. calendarService.generateInterviewCalendar(interview)
2. interviewToICalEvent() converts Interview → iCal event
3. generateICalFile() produces .ics string
4. calendarService.downloadCalendarFile() triggers browser download
```

### Deep Link Flow

| Provider | URL Pattern |
|----------|-------------|
| Google Calendar | `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...` |
| Outlook Web | `https://outlook.live.com/calendar/0/deeplink/compose?subject=...&startdt=...&enddt=...` |

### Calendar Settings

Stored in `localStorage`:

```typescript
interface CalendarSettings {
  reminderMinutes: number[]  // Default: [15]
  defaultFormat: 'ics' | 'google' | 'outlook'
}
```

---

## 3. Integration Providers

### Calendar Integration Catalog

| Provider Key | Name | Status |
|-------------|------|--------|
| `google_calendar` | Google Calendar | `schema_only` |
| `microsoft_calendar` | Microsoft Calendar | `schema_only` |

### Google Calendar API Integration Path

| Requirement | Detail |
|-------------|--------|
| API | Google Calendar API v3 |
| Auth | OAuth 2.0 (user consent) |
| Scopes | `calendar.events`, `calendar.readonly` |
| Flow | OAuth → Get calendar list → Create/list/update events |
| Push | Google Cloud Pub/Sub for real-time sync |

### Microsoft Graph Calendar Integration Path

| Requirement | Detail |
|-------------|--------|
| API | Microsoft Graph API |
| Auth | OAuth 2.0 (MSAL) |
| Scopes | `Calendars.ReadWrite` |
| Flow | OAuth → Get calendars → Create/list/update events |
| Push | Graph Subscriptions for webhook notifications |

---

## 4. Interview Scheduling Flow

### Data Model

| Table | Key Columns |
|-------|-------------|
| `interviews` | `company_id`, `application_id`, `scheduled_at`, `duration_minutes`, `interview_type`, `interviewer_name`, `meeting_link`, `location` |

### Scheduling Workflow

```
1. HR/Recruiter creates interview in pipeline
2. System validates no scheduling conflicts
3. Interview saved to interviews table
4. Calendar event generated (ICS or deep link)
5. Notifications sent to interviewer and candidate
6. Interviewer adds to calendar
7. On interview date: meeting link sent to candidate
8. After interview: feedback collected
```

---

## 5. Sandbox Verification Checklist

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | ICS generation for single interview | Valid `.ics` file with correct fields | ⬜ Pending |
| 2 | ICS generation with reminders | Reminder alarm included | ⬜ Pending |
| 3 | Bulk ICS for multiple interviews | All events in one file | ⬜ Pending |
| 4 | Google Calendar URL | Correct URL with encoded params | ⬜ Pending |
| 5 | Outlook Web URL | Correct URL with encoded params | ⬜ Pending |
| 6 | Meeting link included in event | Link appears in event description | ⬜ Pending |
| 7 | Timezone handling | Events use correct timezone | ⬜ Pending |
| 8 | Duration calculation | End time = start + duration_minutes | ⬜ Pending |

---

## 6. Meeting Link Integration

| Provider | Status | Notes |
|----------|--------|-------|
| Zoom | Planned | OAuth + Create meeting API |
| Google Meet | Planned | Google Calendar API integration |
| Microsoft Teams | Planned | Graph API online meeting |
| Custom URL | ✅ Implemented | Manual `meeting_link` field |

---

## 7. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No real Google Calendar sync | P0 | Implement OAuth + event sync |
| No real Outlook Calendar sync | P0 | Implement MSAL + event sync |
| No conflict detection | P1 | Check for overlapping interviews |
| No Zoom/Meet auto-provision | P1 | Auto-create meeting links |
| No timezone-aware scheduling | P2 | Handle multi-timezone teams |
| No recurring interview support | P3 | Support weekly/monthly patterns |
