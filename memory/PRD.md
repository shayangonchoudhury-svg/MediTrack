# MediTrack — Medicine Dosage Reminder & Editor

## Original Problem Statement
"medicine dosage reminder and editor app"

## User Choices (from initial Q&A)
- Auth: Email/password (JWT httpOnly cookies)
- Reminders: In-app visual only
- Features: medicines CRUD + daily schedule + mark taken/skipped + adherence stats + multiple family profiles
- Theme: Dark and attractive ("Midnight Clinical" — slate-950 + emerald-400)

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) on port 8001, all routes under `/api`
- **Frontend**: React 19 + Tailwind + shadcn-style components + recharts + sonner toasts
- **DB Collections**: users, profiles, medicines, dose_logs, login_attempts
- **Auth**: bcrypt + PyJWT (access 1d / refresh 30d), httpOnly cookies, brute-force lockout (5/15min)

## Implemented (2026-02)
- Email/password register + login with JWT cookie auth
- Default "Self" profile auto-created on register / admin-seed
- Multiple family profiles (CRUD) + profile switcher in header
- Medicines CRUD with dosage, form, time slots, frequency (daily / specific days), color tag, notes, optional start/end dates
- Today's schedule generation honoring frequency rules + dose log status
- Mark dose Taken / Skipped / Undo (idempotent upsert)
- Adherence stats: overall %, current streak (perfect days), 7/14/30-day daily breakdown
- Recharts adherence bar chart, premium dark UI with Outfit + Manrope fonts
- Sonner toasts, mobile bottom-nav, glassmorphism login background
- Comprehensive `data-testid` coverage; pytest suite at `/app/backend/tests/test_meditrack_api.py`

## Test Credentials
- admin@meditrack.app / admin123 (seeded)

## Backlog (P1/P2)
- P1: Push/email reminders (Resend, Web Push)
- P1: Refill tracking (low stock alerts)
- P2: Caregiver sharing / invites
- P2: Drug interaction warnings (RxNorm/OpenFDA)
- P2: Export adherence report (PDF)
- P2: Native iOS/Android via PWA install prompts
