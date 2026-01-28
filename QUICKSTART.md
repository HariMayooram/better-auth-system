# Better Auth - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Configure Environment

```bash
cd auth-system

# Copy example environment file
cp .env.example .env

# Generate a secure secret
openssl rand -base64 32

# Edit .env and set:
# - BETTER_AUTH_SECRET (paste the generated secret above)
# - DATABASE_URL (or sync from team/.env using the script below)
```

### Step 2: Sync OAuth Credentials from team/.env (Optional)

If you have OAuth credentials in `team/.env`, sync them automatically:

```bash
./sync-from-team-env.sh
```

This copies:
- Google, GitHub, Microsoft, Facebook, LinkedIn OAuth credentials
- Database connection (uses Commons database from team)

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Database Migrations

```bash
npm run migrate
```

This creates the necessary tables:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth provider accounts
- `verification` - Email verification tokens

### Step 5: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run prod
```

Server runs at: **http://localhost:3002**

---

## ✅ Verify It's Working

### Test Health Endpoint

```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "better-auth",
  "timestamp": "2025-11-18T...",
  "environment": "development"
}
```

### Test Sign Up

```bash
curl -X POST http://localhost:3002/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Test Sign In

```bash
curl -X POST http://localhost:3002/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 🔗 Integrate with Frontend

### Option 1: Direct API Calls

Any frontend can use Better Auth by calling the REST API:

```javascript
// Sign Up
const response = await fetch('http://localhost:3002/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'User Name'
  })
});

// Sign In
const response = await fetch('http://localhost:3002/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// Get Session
const session = await fetch('http://localhost:3002/api/auth/session', {
  credentials: 'include'
});
```

### Option 2: Better Auth React Client (Already installed in feed)

For React apps (like feed), use the Better Auth client:

```javascript
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  baseURL: "http://localhost:3002"
});

// Use in components
const { data: session } = authClient.useSession();
await authClient.signUp.email({ email, password, name });
await authClient.signIn.email({ email, password });
await authClient.signOut();
```

---

## 🌐 OAuth Provider Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3002/api/auth/callback/google`
4. Copy Client ID and Secret to `.env`

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. New OAuth App
3. Authorization callback URL: `http://localhost:3002/api/auth/callback/github`
4. Copy Client ID and Secret to `.env`

### Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Register new application
3. Add redirect URI: `http://localhost:3002/api/auth/callback/microsoft`
4. Copy Application (client) ID and Secret to `.env`

---

## 🐳 Docker Deployment

```bash
# Build image
docker build -t auth-system .

# Run container
docker run -p 3002:3002 \
  -e BETTER_AUTH_SECRET="your-secret-here" \
  -e DATABASE_URL="postgresql://..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  auth-system
```

---

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | ✅ Yes | Min 32 char secret for JWT signing |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `PORT` | No | Server port (default: 3002) |
| `BASE_URL` | No | Public URL of auth service |
| `ALLOWED_ORIGINS` | No | Comma-separated frontend URLs |
| `GOOGLE_CLIENT_ID` | No | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth Secret |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth Secret |
| `MICROSOFT_CLIENT_ID` | No | Microsoft OAuth Client ID |
| `MICROSOFT_CLIENT_SECRET` | No | Microsoft OAuth Secret |

---

## 🔍 Troubleshooting

### "Database connection failed"
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify database exists and user has permissions

### "CORS error from frontend"
- Add frontend URL to ALLOWED_ORIGINS in .env
- Ensure `credentials: 'include'` is set in fetch requests

### "OAuth provider not working"
- Verify client ID and secret in .env
- Check redirect URI matches exactly in provider console
- Ensure provider is enabled in .env

---

## 📚 Next Steps

- Read [Better Auth Documentation](https://better-auth.com/docs)
- Add email verification (OTP)
- Set up production deployment
- Configure additional OAuth providers
- Customize user fields
