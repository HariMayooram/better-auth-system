# Better Auth Integration Summary

## ✅ What Was Done

### 1. Removed Custom Auth Service
- ❌ Deleted `/auth-service` (custom JWT implementation)
- ❌ Removed `.github/workflows/auth-service-ci.yml`

### 2. Created Standalone `auth-system` Service
- ✅ Shared authentication service at webroot level
- ✅ Can be used across multiple webroot instances
- ✅ Easy to pivot to different auth solutions

### 3. Better Auth Implementation
- ✅ Express.js server with Better Auth
- ✅ JWT-based authentication with HTTP-only cookies
- ✅ PostgreSQL database integration (uses Commons DB from team)
- ✅ OAuth providers: Google, GitHub, Microsoft, Facebook, LinkedIn
- ✅ Email/password authentication
- ✅ Future-ready for OTP email verification

---

## 📁 Project Structure

```
webroot-earth/
├── auth-system/              ← NEW: Standalone auth service
│   ├── src/
│   │   ├── auth.js           ← Better Auth configuration
│   │   ├── index.js          ← Express server
│   │   └── migrate.js        ← Database migrations
│   ├── package.json
│   ├── .env.example
│   ├── Dockerfile
│   ├── sync-from-team-env.sh ← Syncs OAuth creds from team/.env
│   ├── README.md
│   ├── QUICKSTART.md
│   └── INTEGRATION.md        ← This file
│
├── team/                     ← Existing submodule
│   └── .env.example          ← Updated with BETTER_AUTH_URL
│
├── feed/                     ← Existing React app
│   ├── package.json          ← Updated: better-auth installed
│   └── src/
│       └── lib/
│           └── auth-client.js ← NEW: Better Auth client wrapper
│
└── (other repos...)
```

---

## 🔧 Configuration Flow

```
┌─────────────────────────────────────────────────┐
│  team/.env                                      │
│  - OAuth credentials (Google, GitHub, etc.)     │
│  - Database config (Commons PostgreSQL)         │
│  - BETTER_AUTH_URL=http://localhost:3002        │
└────────────────┬────────────────────────────────┘
                 │
                 │ ./sync-from-team-env.sh
                 ▼
┌─────────────────────────────────────────────────┐
│  auth-system/.env                               │
│  - BETTER_AUTH_SECRET (unique to auth service)  │
│  - Synced OAuth credentials                     │
│  - Synced DATABASE_URL                          │
│  - ALLOWED_ORIGINS (frontends)                  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  auth-system service                            │
│  Port: 3002                                     │
│  Endpoints: /api/auth/*                         │
└────────────────┬────────────────────────────────┘
                 │
                 ├─────────► feed (React app)
                 ├─────────► team (admin)
                 └─────────► other webroot sites
```

---

## 🚀 Quick Start

### 1. Set Up auth-system Service

```bash
cd auth-system

# Copy and configure .env
cp .env.example .env

# Generate secret
openssl rand -base64 32
# → Copy this to BETTER_AUTH_SECRET in .env

# Sync OAuth credentials from team/.env
./sync-from-team-env.sh

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start server
npm run dev
```

Server runs at: `http://localhost:3002`

### 2. Verify It's Working

```bash
# Health check
curl http://localhost:3002/health

# Test sign up
curl -X POST http://localhost:3002/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test"}'
```

---

## 🌐 Using with Multiple Sites

### Frontend Configuration

Each frontend (feed, team, etc.) just needs to point to the auth service:

**feed/.env:**
```bash
VITE_AUTH_URL=http://localhost:3002
```

**team/.env:**
```bash
BETTER_AUTH_URL=http://localhost:3002
```

### Add Frontend to Allowed Origins

In `auth-system/.env`:
```bash
ALLOWED_ORIGINS=http://localhost:8887,http://localhost:8888,http://site1.com
```

---

## 🔌 Frontend Integration Options

### Option 1: Direct REST API (Any Framework)

```javascript
// Sign Up
fetch('http://localhost:3002/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies!
  body: JSON.stringify({ email, password, name })
});

// Sign In
fetch('http://localhost:3002/api/auth/sign-in/email', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ email, password })
});

// Get Session
fetch('http://localhost:3002/api/auth/session', {
  credentials: 'include'
});

// OAuth Sign In
window.location.href = 'http://localhost:3002/api/auth/sign-in/social?provider=google&callbackURL=' +
  encodeURIComponent(window.location.origin + '/callback');
```

### Option 2: Better Auth React Client (feed already has this)

```javascript
import { createAuthClient } from "better-auth/react";

const auth = createAuthClient({
  baseURL: "http://localhost:3002"
});

// In components
const { data: session } = auth.useSession();
await auth.signUp.email({ email, password, name });
await auth.signIn.email({ email, password });
await auth.signIn.social({ provider: 'google' });
await auth.signOut();
```

---

## 🔐 Available Auth Methods

### Email/Password
- ✅ Sign up: `POST /api/auth/sign-up/email`
- ✅ Sign in: `POST /api/auth/sign-in/email`
- 🔜 Email verification (add OTP later)

### OAuth Providers
- ✅ Google: `GET /api/auth/sign-in/social?provider=google`
- ✅ GitHub: `GET /api/auth/sign-in/social?provider=github`
- ✅ Microsoft: `GET /api/auth/sign-in/social?provider=microsoft`
- ✅ Facebook: `GET /api/auth/sign-in/social?provider=facebook`

### Session Management
- ✅ Get session: `GET /api/auth/session`
- ✅ Sign out: `POST /api/auth/sign-out`

---

## 🐳 Docker Deployment

```bash
cd auth-system

docker build -t auth-system .

docker run -d -p 3002:3002 \
  -e BETTER_AUTH_SECRET="your-secret" \
  -e DATABASE_URL="postgresql://..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  --name auth-system \
  auth-system
```

---

## 🔄 Pivoting to Different Auth Solutions

Because auth-system is standalone, you can:

1. **Keep this service** and update Better Auth version
2. **Create `auth-custom/`** for custom implementation
3. **Create `auth-supabase/`** for Supabase auth
4. **Run multiple** auth services side-by-side for testing

Just update frontend's `VITE_AUTH_URL` to switch.

---

## ❓ FAQ

### Q: Do I still need the GPC bootstrap scripts?

**A: Yes, if you're deploying to Google Cloud Run.**

The GPC bootstrap scripts (`01_gcp_bootstrap.sh`, etc.) are for:
- Cloud Run deployment
- Database connections (Azure Postgres)
- Secret management in GCP

Better Auth **replaces** the custom auth logic, but **doesn't replace** the deployment infrastructure.

### Q: What about the DUMMY_SECRET error?

**A: Add it to GitHub Secrets.**

```bash
gh secret set DUMMY_SECRET --body "dummyvalue" --repo ModelEarth/team
```

Or via GitHub UI:
1. Go to `https://github.com/ModelEarth/team/settings/secrets/actions`
2. New secret: `DUMMY_SECRET` = `dummyvalue`

This is just a validation check in the workflow to ensure secrets are properly configured.

### Q: How do I share auth between multiple webroot instances?

**A: Single auth-system service, multiple frontends.**

1. Run **one** auth-system service (e.g., on port 3002)
2. Each webroot site points to it via environment variable
3. Add all frontend URLs to ALLOWED_ORIGINS

Example:
```bash
# auth-system/.env
ALLOWED_ORIGINS=http://site1.com,http://site2.com,http://site3.com
```

---

## 📚 Resources

- [Better Auth Documentation](https://better-auth.com/docs)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)
- Quick Start: `auth-system/QUICKSTART.md`
- Main README: `auth-system/README.md`
