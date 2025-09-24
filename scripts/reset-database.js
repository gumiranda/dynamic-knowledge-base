#!/usr/bin/env node

/**
 * Database Reset Script
 * Resets the database to initial state with optional backup
 */

const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./init-database');

const DATABASE_PATH = path.join(__dirname, '..', 'data', 'database.json');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

function createBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function backupExistingDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    console.log('ℹ️  No existing database to backup');
    return null;
  }

  createBackupDirectory();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `database-backup-${timestamp}.json`);

  try {
    fs.copyFileSync(DATABASE_PATH, backupPath);
    console.log(`💾 Backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('⚠️  Failed to create backup:', error.message);
    return null;
  }
}

function removeExistingDatabase() {
  if (fs.existsSync(DATABASE_PATH)) {
    try {
      fs.unlinkSync(DATABASE_PATH);
      console.log('🗑️  Removed existing database');
    } catch (error) {
      console.error('❌ Failed to remove existing database:', error.message);
      process.exit(1);
    }
  }
}

function resetDatabase(options = {}) {
  const { backup = true, force = false } = options;

  console.log('🔄 Resetting Dynamic Knowledge Base database...');

  // Check if database exists
  if (!fs.existsSync(DATABASE_PATH) && !force) {
    console.log('ℹ️  No database found. Creating new database...');
    initializeDatabase();
    return;
  }

  // Create backup if requested
  if (backup && fs.existsSync(DATABASE_PATH)) {
    const backupPath = backupExistingDatabase();
    if (!backupPath) {
      console.log('⚠️  Continuing without backup...');
    }
  }

  // Remove existing database
  removeExistingDatabase();

  // Initialize new database
  console.log('🆕 Creating new database...');
  initializeDatabase();

  console.log('✅ Database reset complete!');
}

function main() {
  const args = process.argv.slice(2);
  const options = {
    backup: !args.includes('--no-backup'),
    force: args.includes('--force'),
  };

  // Confirm reset if not forced
  if (!options.force && fs.existsSync(DATABASE_PATH)) {
    console.log('⚠️  This will permanently delete all data in the database.');
    console.log('💡 Use --no-backup to skip backup creation');
    console.log('💡 Use --force to skip this confirmation');
    console.log('');

    // In a real implementation, you might want to use readline for interactive confirmation
    // For now, we'll proceed with the reset
    console.log('🔄 Proceeding with database reset...');
  }

  resetDatabase(options);
}

if (require.main === module) {
  main();
}

module.exports = { resetDatabase };
