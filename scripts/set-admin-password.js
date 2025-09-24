#!/usr/bin/env node

/**
 * Set Admin Password Script
 * Sets or updates the password for the default admin user
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const DATABASE_PATH = path.join(__dirname, '..', 'data', 'database.json');
const ADMIN_USER_ID = 'user_001';
const ADMIN_EMAIL = 'admin@example.com';

function loadDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    console.error('❌ Database not found. Run npm run db:init first.');
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(DATABASE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load database:', error.message);
    process.exit(1);
  }
}

function saveDatabase(database) {
  try {
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(database, null, 2));
  } catch (error) {
    console.error('❌ Failed to save database:', error.message);
    process.exit(1);
  }
}

async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!/(?=.*\d)/.test(password)) {
    return 'Password must contain at least one number';
  }

  return null;
}

function promptPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Hide password input
    rl.question('Enter new admin password: ', (password) => {
      rl.close();
      resolve(password);
    });

    // Hide the password being typed
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write('*');
      } else {
        rl.output.write(stringToWrite);
      }
    };
    rl.stdoutMuted = true;
  });
}

async function setAdminPassword() {
  console.log('🔐 Setting admin password...\n');

  // Load database
  const database = loadDatabase();

  // Check if admin user exists
  const adminUser = database.users[ADMIN_USER_ID];
  if (!adminUser) {
    console.error(`❌ Admin user not found (ID: ${ADMIN_USER_ID})`);
    console.log('💡 Run npm run db:init to create the default admin user');
    process.exit(1);
  }

  console.log(`👤 Found admin user: ${adminUser.name} (${adminUser.email})`);

  if (adminUser.password) {
    console.log('⚠️  Admin user already has a password set.');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Do you want to update it? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('✅ Password update cancelled');
      process.exit(0);
    }
  }

  // Get password from command line argument or prompt
  let password = process.argv[2];

  if (!password) {
    password = await promptPassword();
    console.log(); // New line after hidden input
  }

  // Validate password
  const validationError = validatePassword(password);
  if (validationError) {
    console.error(`❌ ${validationError}`);
    process.exit(1);
  }

  try {
    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(password);

    // Update admin user
    adminUser.password = hashedPassword;
    adminUser.updatedAt = new Date().toISOString();

    // Save database
    console.log('💾 Saving to database...');
    saveDatabase(database);

    console.log('✅ Admin password set successfully!');
    console.log('\n📋 Admin credentials:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: [HIDDEN]`);
    console.log(`   Role: ${adminUser.role}`);
    console.log('\n💡 You can now login using POST /api/v1/users/login');

  } catch (error) {
    console.error('❌ Failed to set admin password:', error.message);
    process.exit(1);
  }
}

function showUsage() {
  console.log('📖 Usage:');
  console.log('   node scripts/set-admin-password.js [password]');
  console.log('');
  console.log('Examples:');
  console.log('   node scripts/set-admin-password.js                    # Prompts for password');
  console.log('   node scripts/set-admin-password.js MySecurePass123    # Sets password directly');
  console.log('');
  console.log('Password requirements:');
  console.log('   • At least 8 characters long');
  console.log('   • At least one lowercase letter (a-z)');
  console.log('   • At least one uppercase letter (A-Z)');
  console.log('   • At least one number (0-9)');
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
    return;
  }

  setAdminPassword().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

module.exports = { setAdminPassword };
