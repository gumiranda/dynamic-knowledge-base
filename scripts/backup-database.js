#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates timestamped backups of the database
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATABASE_PATH = path.join(__dirname, '..', 'data', 'database.json');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
const MAX_BACKUPS = 10; // Keep only the 10 most recent backups

function createBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 Created backup directory');
  }
}

function validateDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    console.error('❌ Database file not found:', DATABASE_PATH);
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(DATABASE_PATH, 'utf8');
    JSON.parse(data); // Validate JSON
    return true;
  } catch (error) {
    console.error('❌ Database file is corrupted:', error.message);
    process.exit(1);
  }
}

function getBackupFileName(type = 'manual') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `database-${type}-${timestamp}.json`;
}

function createBackup(type = 'manual') {
  console.log(`💾 Creating ${type} backup...`);

  validateDatabase();
  createBackupDirectory();

  const backupFileName = getBackupFileName(type);
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  try {
    // Copy database file
    fs.copyFileSync(DATABASE_PATH, backupPath);

    // Get file stats
    const stats = fs.statSync(DATABASE_PATH);
    const sizeKB = Math.round(stats.size / 1024);

    console.log(`✅ Backup created successfully`);
    console.log(`📁 Location: ${backupPath}`);
    console.log(`📊 Size: ${sizeKB} KB`);

    return backupPath;
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message);
    process.exit(1);
  }
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('📁 No backups directory found');
    return [];
  }

  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((file) => file.startsWith('database-') && file.endsWith('.json'))
      .map((file) => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
        };
      })
      .sort((a, b) => b.created - a.created); // Sort by creation time, newest first

    return files;
  } catch (error) {
    console.error('❌ Failed to list backups:', error.message);
    return [];
  }
}

function cleanOldBackups() {
  const backups = listBackups();

  if (backups.length <= MAX_BACKUPS) {
    return;
  }

  const backupsToDelete = backups.slice(MAX_BACKUPS);

  console.log(`🧹 Cleaning ${backupsToDelete.length} old backups...`);

  backupsToDelete.forEach((backup) => {
    try {
      fs.unlinkSync(backup.path);
      console.log(`   🗑️  Deleted: ${backup.name}`);
    } catch (error) {
      console.error(`   ❌ Failed to delete ${backup.name}:`, error.message);
    }
  });
}

function displayBackupList() {
  const backups = listBackups();

  if (backups.length === 0) {
    console.log('📁 No backups found');
    return;
  }

  console.log(`📋 Found ${backups.length} backup(s):`);
  console.log('');

  backups.forEach((backup, index) => {
    const sizeKB = Math.round(backup.size / 1024);
    const age = Math.round(
      (Date.now() - backup.created.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   📅 Created: ${backup.created.toISOString()}`);
    console.log(`   📊 Size: ${sizeKB} KB`);
    console.log(`   ⏰ Age: ${age} day(s)`);
    console.log('');
  });
}

function compressBackup(backupPath) {
  try {
    const gzipPath = `${backupPath}.gz`;
    execSync(`gzip -c "${backupPath}" > "${gzipPath}"`);
    fs.unlinkSync(backupPath); // Remove original

    const originalSize = fs.statSync(backupPath).size;
    const compressedSize = fs.statSync(gzipPath).size;
    const compressionRatio = Math.round(
      (1 - compressedSize / originalSize) * 100
    );

    console.log(`🗜️  Compressed backup (${compressionRatio}% reduction)`);
    return gzipPath;
  } catch (error) {
    console.log('⚠️  Compression failed, keeping uncompressed backup');
    return backupPath;
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list':
      displayBackupList();
      break;

    case 'clean':
      cleanOldBackups();
      break;

    case 'auto':
      const backupPath = createBackup('auto');
      cleanOldBackups();
      break;

    case 'compress':
      const backups = listBackups();
      if (backups.length > 0) {
        compressBackup(backups[0].path);
      }
      break;

    default:
      // Manual backup
      const manualBackupPath = createBackup('manual');

      // Optionally compress if --compress flag is provided
      if (args.includes('--compress')) {
        compressBackup(manualBackupPath);
      }

      // Clean old backups if --clean flag is provided
      if (args.includes('--clean')) {
        cleanOldBackups();
      }

      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createBackup,
  listBackups,
  cleanOldBackups,
  validateDatabase,
};
