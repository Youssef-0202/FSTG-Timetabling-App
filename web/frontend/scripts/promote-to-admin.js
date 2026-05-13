/**
 * Script to promote an existing user to admin
 * 
 * Usage: 
 * 1. First, sign up a user through the normal signup form
 * 2. Then run: node scripts/promote-to-admin.js <email>
 * 
 * Example: node scripts/promote-to-admin.js user@example.com
 */

import Database from "better-sqlite3";

function promoteToAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.log("Please provide an email address");
    console.log("Usage: node scripts/promote-to-admin.js <email>");
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

    if (user.role === "admin") {
      console.log("User is already an admin!");
      process.exit(0);
    }

    // Update to admin
    db.prepare("UPDATE user SET role = ? WHERE email = ?").run("admin", email);

    console.log("User promoted to admin successfully!");
    console.log("Email:", email);
    console.log("New Role: admin");

  } catch (error) {
    console.error("Error promoting user:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

promoteToAdmin();
