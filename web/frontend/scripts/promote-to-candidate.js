/**
 * Script to promote an existing user to Candidate
 * 
 * Usage: 
 * 1. First, sign up a user through the normal signup form
 * 2. Then run: node scripts/promote-to-candidate.js <email>
 * 
 * Example: node scripts/promote-to-candidate.js candidate@example.com
 */

import Database from "better-sqlite3";

function promoteToCandidate() {
  const email = process.argv[2];

  if (!email) {
    console.log("Please provide an email address");
    console.log("Usage: node scripts/promote-to-candidate.js <email>");
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

    if (user.role === "candidate") {
      console.log("User is already a Candidate!");
      process.exit(0);
    }

    // Update to Candidate
    db.prepare("UPDATE user SET role = ? WHERE email = ?").run("candidate", email);

    console.log("✅ User promoted to Candidate successfully!");
    console.log("📧 Email:", email);
    console.log("🎓 New Role: candidate");
    console.log("\nYou can now login with this account and access /candidate/dashboard");

  } catch (error) {
    console.error("❌ Error promoting user:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

promoteToCandidate();
