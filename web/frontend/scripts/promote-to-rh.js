/**
 * Script to promote an existing user to RH (Recruiter)
 * 
 * Usage: 
 * 1. First, sign up a user through the normal signup form
 * 2. Then run: node scripts/promote-to-rh.js <email>
 * 
 * Example: node scripts/promote-to-rh.js rh@example.com
 */

import Database from "better-sqlite3";

function promoteToRH() {
  const email = process.argv[2];

  if (!email) {
    console.log("Please provide an email address");
    console.log("Usage: node scripts/promote-to-rh.js <email>");
    process.exit(1);
  }

  const db = new Database("./sqlite.db");

  try {
    // Check if user exists
    const user = db
      .prepare("SELECT * FROM user WHERE email = ?")
      .get(email);

    if (!user) {
      console.log("User not found with email:", email);
      console.log("Please sign up first through the signup form");
      process.exit(1);
    }

    // Check current role
    console.log("Current user role:", user.role);

    if (user.role === "rh") {
      console.log("User is already an RH!");
      process.exit(0);
    }

    // Update to RH
    db.prepare("UPDATE user SET role = ? WHERE email = ?").run("rh", email);

    console.log("✅ User promoted to RH successfully!");
    console.log("📧 Email:", email);
    console.log("👔 New Role: rh");
    console.log("\nYou can now login with this account and access /rh/dashboard");

  } catch (error) {
    console.error("❌ Error promoting user:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

promoteToRH();
