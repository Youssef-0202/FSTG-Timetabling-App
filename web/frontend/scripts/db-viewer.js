// Database viewer and management script
// Run with: node scripts/db-viewer.js

const Database = require('better-sqlite3');
const db = new Database('./sqlite.db');

console.log('🗄️  SQLite Database Viewer\n');

// Function to display all users
function showAllUsers() {
  console.log('👥 All Users:');
  console.log('─'.repeat(80));
  const users = db.prepare(`
    SELECT id, name, email, role, emailVerified, createdAt 
    FROM user 
    ORDER BY createdAt DESC
  `).all();
  
  if (users.length === 0) {
    console.log('No users found.');
  } else {
    console.table(users);
  }
  console.log('');
}

// Function to display all sessions
function showAllSessions() {
  console.log('🔐 Active Sessions:');
  console.log('─'.repeat(80));
  const sessions = db.prepare(`
    SELECT 
      s.id,
      u.name as userName,
      u.email as userEmail,
      s.createdAt,
      s.expiresAt
    FROM session s
    JOIN user u ON s.userId = u.id
    WHERE s.expiresAt > datetime('now')
    ORDER BY s.createdAt DESC
  `).all();
  
  if (sessions.length === 0) {
    console.log('No active sessions.');
  } else {
    console.table(sessions);
  }
  console.log('');
}

// Function to show statistics
function showStats() {
  console.log('📊 Database Statistics:');
  console.log('─'.repeat(80));
  
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM user').get();
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM user WHERE role = 'admin'").get();
  const userCount = db.prepare("SELECT COUNT(*) as count FROM user WHERE role = 'user'").get();
  const activeSessions = db.prepare("SELECT COUNT(*) as count FROM session WHERE expiresAt > datetime('now')").get();
  
  console.log(`Total Users:      ${totalUsers.count}`);
  console.log(`  - Admins:       ${adminCount.count}`);
  console.log(`  - Regular Users: ${userCount.count}`);
  console.log(`Active Sessions:  ${activeSessions.count}`);
  console.log('');
}

// Function to make a user admin
function makeAdmin(email) {
  const result = db.prepare(`
    UPDATE user 
    SET role = 'admin' 
    WHERE email = ?
  `).run(email);
  
  if (result.changes > 0) {
    console.log(`✅ User ${email} is now an admin!`);
  } else {
    console.log(`❌ User ${email} not found.`);
  }
}

// Function to make a user regular user
function makeUser(email) {
  const result = db.prepare(`
    UPDATE user 
    SET role = 'user' 
    WHERE email = ?
  `).run(email);
  
  if (result.changes > 0) {
    console.log(`✅ User ${email} is now a regular user!`);
  } else {
    console.log(`❌ User ${email} not found.`);
  }
}

// Main execution
try {
  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  if (command === 'make-admin' && param) {
    makeAdmin(param);
  } else if (command === 'make-user' && param) {
    makeUser(param);
  } else {
    // Default: show everything
    showStats();
    showAllUsers();
    showAllSessions();
  }

  console.log('💡 Usage:');
  console.log('  node scripts/db-viewer.js                    - Show all data');
  console.log('  node scripts/db-viewer.js make-admin <email> - Make user admin');
  console.log('  node scripts/db-viewer.js make-user <email>  - Make user regular user');
  console.log('');

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
