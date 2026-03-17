'use strict';

/**
 * Database service module.
 * Provides a singleton better-sqlite3 Database instance configured
 * via the SQLITE_DB environment variable.
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Resolve the SQLite file path.
// Priority: SQLITE_DB env var (set in .env and injected by the platform) ->
//           absolute fallback computed relative to this file's location.
// The fallback assumes the standard workspace layout:
//   <workspace-root>/simple-notes-manager-333248-333262/notes_backend/src/services/db.js
//   <workspace-root>/simple-notes-manager-333248-333264/database/myapp.db
const dbPath = process.env.SQLITE_DB ||
  path.resolve(
    __dirname,          // …/notes_backend/src/services
    '..', '..', '..', // up to simple-notes-manager-333248-333262
    '..', '..', '..', // up to the workspace root (code-generation)
    'simple-notes-manager-333248-333264',
    'database',
    'myapp.db'
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
