# AdminMate AI — Production Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  Dashboard │ Jobs │ Candidates │ Chat │ Settings │ Reports      │
└────────────────────────────┬────────────────────────────────────┘
                             │ Supabase Client SDK
┌────────────────────────────▼────────────────────────────────────┐
│                     SUPABASE PLATFORM                           │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌─────────────┐ │
│  │   Auth   │  │ PostgREST │  │    Realtime │  │   Storage   │ │
│  │  (GoTrue)│  │  (API)    │  │  (WS push)  │  │  (Files)    │ │
│  └──────────┘  └───────────┘  └────────────┘  └─────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Edge Functions (Deno)                     ││
│  │  mate-ai-chat │ screen-resume │ generate-jd │ send-email   ││
│  │  whatsapp-webhook │ line-webhook │ parse-resume │ metrics   ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  PostgreSQL Database                        ││
│  │  companies │ user_profiles │ jobs │ candidates │ applications││
│  │  interviews │ offers │ documents │ onboarding_checklists     ││
│  │  chat_messages │ chat_platform_connections │ notifications  ││
│  │  audit_logs │ ai_usage_log │ rate_limits │ subscriptions    ││
│  │  pdpa_consent │ messages (NEW) │ message_queue (NEW)        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  WhatsApp    │  │    LINE      │  │   Google Gemini AI   │  │
│  │  Cloud API   │  │  Messaging   │  │   (LLM Backend)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Gmail      │  │   Sentry     │  │   Vercel (Deploy)    │  │
│  │   (Email)    │  │   (Errors)   │  │   (Hosting)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema (Production)

### Core Tables (Existing)
- `companies` — Multi-tenant root
- `user_profiles` — Auth users with roles
- `jobs` — Job postings per company
- `candidates` — Candidate profiles
- `applications` — Job applications
- `interviews` — Interview scheduling
- `offers` — Job offers
- `documents` — Company documents
- `onboarding_checklists` — New hire onboarding

### Messaging Tables (Existing + Enhanced)
- `chat_messages` — In-app chat messages
- `chat_platform_connections` — WhatsApp/LINE connection config

### NEW Production Tables
- `messages` — Unified message store (all platforms)
- `message_queue` — Outbox pattern for reliable delivery
- `conversation_threads` — Track conversations across platforms
- `platform_sync_log` — Webhook delivery tracking
- `system_health` — Service health monitoring

## Messaging Architecture

### Unified Message Flow
```
User sends message (WhatsApp/LINE/Web)
         │
         ▼
   Webhook Endpoint
   (signature verification)
         │
         ▼
   ┌─────────────┐
   │  Validate &  │
   │  Normalize   │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐     ┌──────────────┐
   │  Store in    │────▶│  Audit Log   │
   │  messages    │     └──────────────┘
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Detect      │
   │  Intent      │
   └──────┬──────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
 Command    General
 Handler    AI Chat
    │           │
    ▼           ▼
 ┌────────────────┐
 │  Generate       │
 │  Response       │
 └───────┬────────┘
         │
         ▼
   ┌─────────────┐
   │  Queue in    │
   │  message_    │
   │  queue       │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Send via    │
   │  Platform API│
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Update      │
   │  delivery    │
   │  status      │
   └─────────────┘
```

### Platform Integration

#### WhatsApp (Cloud API v22.0)
- **Webhook**: `POST /functions/v1/whatsapp-webhook`
- **Send**: Facebook Graph API `/{phone_id}/messages`
- **Features**: Text, template messages, media
- **Verification**: `hub.verify_token` challenge-response

#### LINE (Messaging API)
- **Webhook**: `POST /functions/v1/line-webhook`
- **Send**: `POST https://api.line.me/v2/bot/message/reply`
- **Features**: Text, flex messages, quick replies
- **Verification**: HMAC-SHA256 signature

### Intent Detection
```
Input → Keyword Match → {jobs, status, help, apply, general}
                          │
                          ▼
              ┌──────────────────────┐
              │  jobs: List openings  │
              │  status: App status   │
              │  help: Menu           │
              │  apply: Start apply   │
              │  general: AI chat     │
              └──────────────────────┘
```

## API Endpoints (Edge Functions)

### Authentication
| Function | Method | Auth | Description |
|----------|--------|------|-------------|
| `auth/*` | POST | Public | Login, signup, OAuth |

### Core Business
| Function | Method | Auth | Description |
|----------|--------|------|-------------|
| `mate-ai-chat` | POST | User | AI chat with context |
| `screen-resume` | POST | HR/Admin | AI resume screening |
| `generate-jd` | POST | HR/Admin | AI job description |
| `parse-resume` | POST | HR/Admin | Extract CV data |
| `generate-offer-content` | POST | HR/Admin | AI offer letter |
| `send-email` | POST | System | Email dispatch |
| `send-document-reminders` | POST | Cron | Document reminders |
| `log-client-error` | POST | Public | Frontend error log |
| `metrics` | GET | Admin | System metrics |

### Messaging (NEW)
| Function | Method | Auth | Description |
|----------|--------|------|-------------|
| `whatsapp-webhook` | GET/POST | Webhook | WhatsApp messages |
| `line-webhook` | POST | Webhook | LINE messages |
| `messaging-hub` | POST | User | Send outbound message |
| `conversation-history` | GET | User | Chat history by platform |

## Chaos Testing Strategy

### Test Categories
1. **Webhook Chaos** — Invalid signatures, malformed payloads, replay attacks
2. **Database Chaos** — Connection drops, deadlocks, constraint violations
3. **API Chaos** — Timeouts, rate limits, AI service failures
4. **Platform Chaos** — WhatsApp/LINE API downtime, invalid tokens
5. **Concurrency Chaos** — Race conditions, duplicate messages, session conflicts

### Parallel Execution
```bash
# Run all chaos tests in parallel
npx vitest run tests/chaos/ --reporter=verbose --pool=forks

# Run specific chaos category
npx vitest run tests/chaos/webhook.chaos.test.ts
npx vitest run tests/chaos/database.chaos.test.ts
npx vitest run tests/chaos/messaging.chaos.test.ts
```

## Production Deployment

### Environment Variables (Required)
```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# AI
VITE_GEMINI_MODEL=gemini-2.5-flash

# WhatsApp
WHATSAPP_API_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...

# LINE
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...

# System
DEFAULT_COMPANY_ID=...
SENTRY_DSN=...
```

### Health Checks
- `GET /functions/v1/metrics` — System health
- Database connection pooling via Supabase
- Edge function cold start monitoring
- Message delivery rate tracking
