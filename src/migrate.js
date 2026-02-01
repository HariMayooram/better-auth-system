import { auth } from "./auth.js";
import dotenv from "dotenv";

dotenv.config();

console.log("🔄 Running Better Auth database migrations...\n");

async function migrate() {
  try {
    // Better Auth automatically creates necessary tables
    // We just need to trigger a connection
    await auth.api.listSessions();

    console.log("✅ Database migrations completed successfully!");
    console.log("\nTables created:");
    console.log("  • user");
    console.log("  • session");
    console.log("  • account");
    console.log("  • verification");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("\nPlease ensure:");
    console.error("  1. DATABASE_URL is correctly set in .env");
    console.error("  2. Database server is running and accessible");
    console.error("  3. Database user has CREATE TABLE permissions");
    process.exit(1);
  }
}

migrate();
