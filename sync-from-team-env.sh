#!/bin/bash
# Sync OAuth credentials from team/.env to auth-system/.env

TEAM_ENV="../team/.env"
AUTH_ENV=".env"

if [ ! -f "$TEAM_ENV" ]; then
  echo "❌ team/.env not found at $TEAM_ENV"
  echo "Please create team/.env from team/.env.example"
  exit 1
fi

echo "🔄 Syncing OAuth credentials from team/.env to auth-system/.env"

# Create .env if it doesn't exist
if [ ! -f "$AUTH_ENV" ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
fi

# Extract values from team/.env and update auth-system/.env
sync_var() {
  local var_name=$1
  local value=$(grep "^${var_name}=" "$TEAM_ENV" | cut -d '=' -f2-)

  if [ -n "$value" ]; then
    # Update or add the variable in auth-system/.env
    if grep -q "^${var_name}=" "$AUTH_ENV"; then
      sed -i "s|^${var_name}=.*|${var_name}=${value}|" "$AUTH_ENV"
    else
      echo "${var_name}=${value}" >> "$AUTH_ENV"
    fi
    echo "  ✓ Synced $var_name"
  fi
}

# Sync OAuth credentials
sync_var "GOOGLE_CLIENT_ID"
sync_var "GOOGLE_CLIENT_SECRET"
sync_var "GITHUB_CLIENT_ID"
sync_var "GITHUB_CLIENT_SECRET"
sync_var "MICROSOFT_CLIENT_ID"
sync_var "MICROSOFT_CLIENT_SECRET"
sync_var "FACEBOOK_CLIENT_ID"
sync_var "FACEBOOK_CLIENT_SECRET"
sync_var "LINKEDIN_CLIENT_ID"
sync_var "LINKEDIN_CLIENT_SECRET"

# Sync database URL (construct from team DB config)
COMMONS_HOST=$(grep "^COMMONS_HOST=" "$TEAM_ENV" | cut -d '=' -f2-)
COMMONS_PORT=$(grep "^COMMONS_PORT=" "$TEAM_ENV" | cut -d '=' -f2-)
COMMONS_NAME=$(grep "^COMMONS_NAME=" "$TEAM_ENV" | cut -d '=' -f2-)
COMMONS_USER=$(grep "^COMMONS_USER=" "$TEAM_ENV" | cut -d '=' -f2-)
COMMONS_PASSWORD=$(grep "^COMMONS_PASSWORD=" "$TEAM_ENV" | cut -d '=' -f2-)
COMMONS_SSL_MODE=$(grep "^COMMONS_SSL_MODE=" "$TEAM_ENV" | cut -d '=' -f2-)

if [ -n "$COMMONS_HOST" ] && [ -n "$COMMONS_NAME" ]; then
  DATABASE_URL="postgresql://${COMMONS_USER}:${COMMONS_PASSWORD}@${COMMONS_HOST}:${COMMONS_PORT}/${COMMONS_NAME}?sslmode=${COMMONS_SSL_MODE}"

  if grep -q "^DATABASE_URL=" "$AUTH_ENV"; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "$AUTH_ENV"
  else
    echo "DATABASE_URL=${DATABASE_URL}" >> "$AUTH_ENV"
  fi
  echo "  ✓ Synced DATABASE_URL"
fi

echo ""
echo "✅ Sync complete!"
echo ""
echo "📝 Note: You still need to set these manually in auth-system/.env:"
echo "  - BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)"
echo "  - BASE_URL (e.g., http://localhost:3002)"
echo "  - ALLOWED_ORIGINS (e.g., http://localhost:8887,http://localhost:8888)"
