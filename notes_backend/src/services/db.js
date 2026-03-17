'use strict';

/**
 * Database service module.
 * Provides a singleton better-sqlite3 Database instance configured
 * via the SQLITE_DB environment variable.
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Resolve the SQLite file path from environment or fall back to a local default.
const dbPath = process.env.SQLITE_DB ||
  path.join(
    __dirname,
    '../../../../simple-notes-manager-333248-333264/database/myapp.db'
  );

let db;

/**
 * Returns the singleton Database instance, creating it on first call.
 * Enables WAL journal mode and foreign-key enforcement.
 *
 * @returns {import('better-sqlite3').Database} The open database handle.
 */
// PUBLIC_INTERFACE
function getDb() {
  if (!db) {
    db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log(`[db] Connected to SQLite database at ${dbPath}`);
  }
  return db;
}

module.exports = { getDb };
