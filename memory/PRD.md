# Sahaaya — Product Requirements Document

## Original Problem Statement
Build a responsive MERN-style web app "Sahaaya" — an AI-powered community platform for elderly people that reduces loneliness, improves accessibility, and encourages social interaction. Multilingual (English/Hindi/Kannada), large fonts/buttons, JWT auth, Web Speech API, i18next. Home dashboard: Communities, AI Companion, Daily Care, Memory Corner, Mood Check, SOS, Profile.

Note: Environment uses FastAPI + MongoDB + React (not Node/Express). Backend functionality is identical.

## Architecture
- Backend: FastAPI + Motor (async MongoDB) + JWT + bcrypt + emergentintegrations (Gemini 3 Flash)
- Frontend: React 19 + React Router 7 + Tailwind + i18next + Web Speech API
- Auth: JWT bearer tokens, stored in localStorage as `sahaaya-token`
- Images: Base64 stored inline in MongoDB (MVP)

## User Personas
- Seniors 55+ in India, mixed digital literacy, may have visual/motor decline
- Preferred languages: English, Hindi, Kannada
- Primary needs: companionship, gentle routines, easy family reach in emergency

## Core Requirements
- Multilingual UI (EN/HI/KN) with prominent toggle
- Large tap targets (56px+), 18px+ base font, WCAG AAA contrast
- 7 dashboard tiles + prominent red SOS
- Voice input/output for AI Companion (Web Speech API)
- Community browse/create/join, posts with images and likes
- Daily care checklist, memory corner, mood check with AI suggestion

## Implemented (2026-02)
- JWT auth (register/login/me) with bcrypt
- Profile setup (name, age, city, language, interests, emergency contact)
- Dashboard with 7 tiles + SOS
- Communities: list, create, join/leave, detail view with posts + likes + image upload
- 7 demo communities auto-seeded (Gardening, Cooking, Yoga, Bhajans, Reading, Music, Walking)
- AI Companion: chat + Web Speech API (mic + read aloud), medical disclaimer, session persistence, quick suggestions
- Daily Care checklist with progress bar (6 items)
- Memory Corner with photo + story
- Mood Check with 5 moods and personalized AI-authored suggestion
- SOS modal with confirmation + call emergency contact + call 108
- Floating SOS on all internal pages, tile SOS on dashboard
- i18n for all UI strings in EN/HI/KN

## Backlog (P0/P1/P2)
- P0: Ensure Emergent LLM key has budget so AI Companion produces real replies (currently falls back to friendly error when budget=0)
- P1: Text-to-speech language matching for KN could benefit from voice picking
- P1: Notifications (medicine reminder push)
- P2: Video call feature between friends
- P2: Family-view access with read-only mood/care visibility
- P2: More Indian language support (Tamil, Telugu, Marathi)

## Iteration 2 — Instagram-Style Pivot (2026-02)

### Removed
- SOS button (all screens)
- Mood Check page + route
- Daily Care page + route
- emergency_contact field from profile

### Added
- Global Feed with system posts (health tips, nostalgia, festivals, tech tips)
- Stories bar (24hr TTL) with image/video/caption + full-screen viewer
- Friend request system: send, accept, reject; Friends list; Discover users
- Comments on posts (nested chat UI)
- Video uploads on posts + stories (base64)
- Voice-to-text post composer (Web Speech API, continuous)
- 3-icon mobile bottom nav: Home / Groups / Family
- Desktop top nav with Home/Groups/Family/Memory Lane/AI Companion
- Renamed: Communities → Groups; Memory Corner → Memory Lane
- Auto-caption on memories (simple derivation)
- Avatar upload on profile setup
- 4 seeded demo user accounts + friendship discoverability
- Catch-all route → /

### Backlog (P0/P1/P2)
- P1: Video/audio calling (WebRTC) with family
- P1: Push notifications for friend requests and comments
- P1: Memory Lane AI auto-caption via Gemini (currently simple template)
- P2: Post sharing to WhatsApp with generated image card
- P2: Voice message posts (audio recording)
- P2: Follow (asymmetric) alongside friend (symmetric)

## Iteration 3 — Reminders, Nostalgia, Voice Nav, Nearby, Multilingual AI (2026-02)

### Added
- **Daily medical reminders**: add title/time/category/notes, mark taken-today, delete. Due reminders card on Feed. Toggle mark-done from feed or reminders page.
- **Nostalgia section**: 10 seeded items (Bollywood songs, historic events, festivals) with category filters and YouTube search links for songs.
- **Voice Navigation**: mic button on Feed that maps spoken commands (EN/HI/KN) to routes — "Groups", "Family", "Reminders", "Nostalgia", "Events", "Memory Lane", "AI Friend", "Profile".
- **Nearby program notifications**: 9 seeded events across 4 cities; user's-city events appear first with a "Nearby" badge; RSVP toggle; notification bell in header aggregates friend requests + nearby events + due reminders with 60s polling.
- **Language-aware AI chat**: /api/chat accepts `language` param and adapts system prompt + fallback message. Verified Hindi and Kannada replies via Gemini 3 Flash.
- Bundled Noto Sans Devanagari + Noto Sans Kannada for consistent rendering.

### Test Coverage
- Iteration 3: 20/20 backend + all frontend flows PASS
- Iteration 2: 21/21 backend regression PASS

### Backlog (P1/P2)
- P1: Push/browser notifications for reminder times (currently in-app only)
- P1: WebRTC video calls with family
- P1: Voice navigation feedback overlay in Devanagari/Kannada
- P2: Auto-generate images for nostalgia items via Gemini Nano Banana
- P2: Location-aware events (GPS instead of profile city)

## Iteration 4 — DMs, Instagram-style Profiles, Full i18n, Mobile Responsive (2026-02)

### Added
- **Personal Messages (DMs)**: 1-on-1 text/image conversations with friends; conversations list + thread view; unread badges; header messages icon; 4th slot in mobile bottom nav
- **Instagram-style profile pages** at `/users/:id`: avatar, name, edit/message/add-friend action, stats (posts + friends), city, bio, interests, 3-column posts grid with hover stats. Own profile at `/profile` redirects to `/users/<me>`
- **Full i18n coverage** (~80 new keys × 3 languages): reminders, nostalgia, events, messages, voice-nav, notifications, family, groups, profile stats — all switch on toggle
- **Mobile-responsive header**: avatar-only profile link, messages icon, notification bell, language toggle, logout — all fit on 360px width; tagline hidden below xl; header logo compresses
- **4-item bottom nav** on mobile: Home / Groups / Family / Messages
- Post authors are now clickable links to their profile
- Friend rows have quick "Message" button
- Bundled Noto Sans Devanagari + Kannada for consistent multilingual rendering (from iteration 3)

### Fixes from testing
- ConversationPage: unnested `<Link>` (invalid HTML) — back button and profile link are now siblings
- `/messages/thread/{id}`: mark-read now runs before fetch so response reflects fresh state

### Test coverage
- Iteration 4: **54/54 pytest** (13 new + 41 regression) + full frontend flows PASS

### Backlog (P1/P2)
- P1: Push/browser notifications for reminders and unread messages
- P1: Split server.py into routers (auth, users, social, health, messages)
- P1: Video/audio calling with friends (WebRTC)
- P2: Post pagination on profile page
- P2: Compound Mongo indexes for messages/events at scale
- P2: GPS-based nearby events (currently profile city)
- P2: Optimistic UI updates for message send
