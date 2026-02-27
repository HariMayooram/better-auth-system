import { betterAuth } from "better-auth";
import dotenv from "dotenv";

dotenv.config();

// Parse AUTH_CONFIG JSON secret (single secret approach for Secret Manager)
// Falls back to individual environment variables for local development
const cfg = (() => {
  if (process.env.AUTH_CONFIG) {
    try {
      return JSON.parse(process.env.AUTH_CONFIG);
    } catch (e) {
      throw new Error("Failed to parse AUTH_CONFIG JSON: " + e.message);
    }
  }
  return null;
})();

// Get a value from AUTH_CONFIG JSON or fall back to an env var
function get(keys, envVar) {
  if (cfg) {
    let val = cfg;
    for (const key of keys) val = val?.[key];
    return val || "";
  }
  return process.env[envVar] || "";
}

export const auth = betterAuth({
  // No database configuration - this automatically enables stateless mode
  secret: (() => {
    const secret = get(['auth', 'secret'], 'BETTER_AUTH_SECRET');
    if (!secret) throw new Error("auth.secret is required in AUTH_CONFIG");
    if (secret.length < 32) throw new Error("auth.secret must be at least 32 characters long");
    return secret;
  })(),
  baseURL: (() => {
    const baseURL = process.env.NODE_ENV !== 'production'
      ? (process.env.BASE_URL || "http://localhost:3002")
      : process.env.BASE_URL;

    if (process.env.NODE_ENV === 'production' && !process.env.BASE_URL) {
      throw new Error("BASE_URL environment variable is required in production");
    }

    return baseURL;
  })(),
  trustedOrigins: (() => {
    if (cfg?.allowedOrigins) return cfg.allowedOrigins;
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (!allowedOrigins) {
      if (process.env.NODE_ENV !== 'production') {
        return ["http://localhost:8887", "http://localhost:8888"];
      }
      throw new Error("allowedOrigins is required in AUTH_CONFIG");
    }
    return allowedOrigins.split(',').map(origin => origin.trim());
  })(),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days cache duration
      strategy: "jwe", // "jwe" is recommended for encrypted cookies
    },
  },
  socialProviders: {
    google: {
      clientId: get(['google', 'clientId'], 'GOOGLE_CLIENT_ID'),
      clientSecret: get(['google', 'clientSecret'], 'GOOGLE_CLIENT_SECRET'),
      enabled: !!(get(['google', 'clientId'], 'GOOGLE_CLIENT_ID') && get(['google', 'clientSecret'], 'GOOGLE_CLIENT_SECRET')),
    },
    linkedin: {
      clientId: get(['linkedin', 'clientId'], 'LINKEDIN_CLIENT_ID'),
      clientSecret: get(['linkedin', 'clientSecret'], 'LINKEDIN_CLIENT_SECRET'),
      enabled: !!(get(['linkedin', 'clientId'], 'LINKEDIN_CLIENT_ID') && get(['linkedin', 'clientSecret'], 'LINKEDIN_CLIENT_SECRET')),
    },
    github: {
      clientId: get(['github', 'clientId'], 'GITHUB_CLIENT_ID'),
      clientSecret: get(['github', 'clientSecret'], 'GITHUB_CLIENT_SECRET'),
      enabled: !!(get(['github', 'clientId'], 'GITHUB_CLIENT_ID') && get(['github', 'clientSecret'], 'GITHUB_CLIENT_SECRET')),
    },
    microsoft: {
      clientId: get(['microsoft', 'clientId'], 'MICROSOFT_CLIENT_ID'),
      clientSecret: get(['microsoft', 'clientSecret'], 'MICROSOFT_CLIENT_SECRET'),
      tenantId: "common",
      enabled: !!(get(['microsoft', 'clientId'], 'MICROSOFT_CLIENT_ID') && get(['microsoft', 'clientSecret'], 'MICROSOFT_CLIENT_SECRET')),
    },
    discord: {
      clientId: get(['discord', 'clientId'], 'DISCORD_CLIENT_ID'),
      clientSecret: get(['discord', 'clientSecret'], 'DISCORD_CLIENT_SECRET'),
      enabled: !!(get(['discord', 'clientId'], 'DISCORD_CLIENT_ID') && get(['discord', 'clientSecret'], 'DISCORD_CLIENT_SECRET')),
    },
    facebook: {
      clientId: get(['facebook', 'clientId'], 'FACEBOOK_CLIENT_ID'),
      clientSecret: get(['facebook', 'clientSecret'], 'FACEBOOK_CLIENT_SECRET'),
      enabled: !!(get(['facebook', 'clientId'], 'FACEBOOK_CLIENT_ID') && get(['facebook', 'clientSecret'], 'FACEBOOK_CLIENT_SECRET')),
    },
  },
  advanced: {
    storeStateStrategy: "cookie",
    useSecureCookies: process.env.NODE_ENV === "production",
    cookieSameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      path: "/",
    },
  },
});
