import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || "0.0.0.0";

// Trust proxy for Cloud Run (required for proper IP detection and rate limiting)
app.set('trust proxy', true);

// Parse allowed origins from environment
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
  : ["http://localhost:8887", "http://localhost:8888"];

// HTTPS enforcement in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url);
    }
  }
  next();
});

// Security headers
app.use((req, res, next) => {
  // HSTS header in production
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Security headers for all environments
  res.set('X-Frame-Options', 'DENY');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "frame-ancestors 'none';"
  );

  next();
});

// Health check endpoint (MUST be before CORS to allow Cloud Run health checks)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "better-auth-stateless", // Updated service name
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Favicon route to prevent 404 errors
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // No Content
});

// CORS configuration - allow credentials for cookie-based auth
app.use(
  cors({
    origin: (origin, callback) => {
      // OAuth callbacks from providers don't include Origin header - allow them
      // Health check endpoint handled before this middleware
      if (!origin) {
        return callback(null, true); // Allow requests without origin (OAuth callbacks)
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Blocked CORS request from: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Removed OPTIONS, handled automatically
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // Cache preflight for 24 hours
  })
);

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Direct OAuth redirect endpoint - bypasses third-party cookie issues
// Usage: Navigate (not fetch) to /oauth/:provider?redirect=https://your-site.com
app.get("/oauth/:provider", async (req, res) => {
  const { provider } = req.params;
  const redirectUrl = req.query.redirect;

  // Validate provider
  const validProviders = ['google', 'github', 'linkedin', 'microsoft', 'discord', 'facebook'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  // Validate redirect URL against allowed origins
  if (!redirectUrl) {
    return res.status(400).json({ error: 'redirect parameter is required' });
  }

  try {
    const redirectOrigin = new URL(redirectUrl).origin;
    if (!allowedOrigins.includes(redirectOrigin)) {
      return res.status(403).json({ error: 'Redirect URL not in allowed origins' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid redirect URL' });
  }

  // Forward to Better Auth's sign-in endpoint using internal request
  // This sets cookies in first-party context (user navigated directly here)
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

  try {
    // Create the OAuth request to Better Auth
    const response = await fetch(`${baseUrl}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify({
        provider: provider,
        callbackURL: redirectUrl
      })
    });

    // Get the Set-Cookie headers from Better Auth response
    const setCookieHeaders = response.headers.getSetCookie ?
      response.headers.getSetCookie() :
      response.headers.get('set-cookie');

    if (setCookieHeaders) {
      // Forward cookies to the client
      if (Array.isArray(setCookieHeaders)) {
        setCookieHeaders.forEach(cookie => res.append('Set-Cookie', cookie));
      } else if (setCookieHeaders) {
        res.append('Set-Cookie', setCookieHeaders);
      }
    }

    const data = await response.json();

    if (data.url) {
      // Redirect to OAuth provider
      return res.redirect(data.url);
    } else {
      return res.status(500).json({ error: 'Failed to get OAuth URL' });
    }
  } catch (error) {
    console.error('OAuth redirect error:', error);
    return res.status(500).json({ error: 'OAuth initialization failed' });
  }
});

// Auth routes - MUST be after CORS and body parsing
app.use("/api", toNodeHandler(auth));

// Error handling middleware
app.use((err, req, res, next) => {
  // Log full error server-side only (never send to client)
  console.error("[ERROR]", {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.path,
  });

  // Determine if we should show detailed errors
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Generic error message for production
  const errorMessage = isDevelopment
    ? err.message || "Internal server error"
    : "Internal server error";

  // Send safe error response
  res.status(err.status || 500).json({
    error: errorMessage,
    ...(isDevelopment && { stack: err.stack }) // Only in development
  });
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`\n JWT Auth Service running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`\n Allowed Origins:`);
  allowedOrigins.forEach(origin => {
    console.log(`   ✓ ${origin}`);
  });

  console.log(`\n💡 Simple JWT authentication (no database) with hardcoded user\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});
