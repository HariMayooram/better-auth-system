import { betterAuth } from "better-auth";
import dotenv from "dotenv";

dotenv.config();

export const auth = betterAuth({
  // No database configuration - this automatically enables stateless mode
  secret: (() => {
    if (!process.env.BETTER_AUTH_SECRET) {
      throw new Error("BETTER_AUTH_SECRET environment variable is required and must be at least 32 characters");
    }
    if (process.env.BETTER_AUTH_SECRET.length < 32) {
      throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long");
    }
    return process.env.BETTER_AUTH_SECRET;
  })(),
  baseURL: (() => {
    const baseURL = process.env.NODE_ENV !== 'production'
      ? (process.env.BASE_URL || "http://localhost:3002")
      : process.env.BASE_URL;

    // console.log('[Better Auth Config] NODE_ENV:', process.env.NODE_ENV);
    // console.log('[Better Auth Config] BASE_URL from env:', process.env.BASE_URL);
    // console.log('[Better Auth Config] Final baseURL:', baseURL);

    if (process.env.NODE_ENV === 'production' && !process.env.BASE_URL) {
      throw new Error("BASE_URL environment variable is required in production");
    }

    return baseURL;
  })(),
  trustedOrigins: (() => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (!allowedOrigins) {
      if (process.env.NODE_ENV !== 'production') {
        return ["http://localhost:8887", "http://localhost:8888"];
      }
      throw new Error("ALLOWED_ORIGINS environment variable is required in production");
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
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      enabled: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      tenantId: "common",
      enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      enabled: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      enabled: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
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
