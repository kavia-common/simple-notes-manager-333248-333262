'use strict';

/**
 * Notes service module.
 * Encapsulates all database operations for notes, including CRUD and search.
 */

const { getDb } = require('./db');

/**
 * Fetch all notes, ordered by most recently updated.
 * Each note includes a comma-separated list of its tag names.
 *
 * @returns {Array<Object>} Array of note objects.
 */
// PUBLIC_INTERFACE
function getAllNotes() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      n.id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      GROUP_CONCAT(t.name, ',') AS tags
    FROM notes n
    LEFT JOIN note_tags nt ON nt.note_id = n.id
    LEFT JOIN tags t       ON t.id = nt.tag_id
    GROUP BY n.id
    ORDER BY n.updated_at DESC
  `);
  return stmt.all().map(normalizeNote);
}

/**
 * Fetch a single note by its primary key.
 *
 * @param {number|string} id - The note's integer ID.
 * @returns {Object|null} The note object, or null if not found.
 */
// PUBLIC_INTERFACE
function getNoteById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      n.id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      GROUP_CONCAT(t.name, ',') AS tags
    FROM notes n
    LEFT JOIN note_tags nt ON nt.note_id = n.id
    LEFT JOIN tags t       ON t.id = nt.tag_id
    WHERE n.id = ?
    GROUP BY n.id
  `);
  const row = stmt.get(Number(id));
  return row ? normalizeNote(row) : null;
}

/**
 * Create a new note, optionally associating it with tags.
 *
 * @param {string} title   - Note title.
 * @param {string} content - Note body content.
 * @param {string[]} [tags=[]] - Array of tag name strings.
 * @returns {Object} The newly created note.
 */
// PUBLIC_INTERFACE
function createNote(title, content, tags = []) {
  const db = getDb();

  const insert = db.transaction(() => {
    const now = new Date().toISOString();
    const info = db.prepare(
      'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)'
    ).run(title || '', content || '', now, now);

    const noteId = info.lastInsertRowid;
    setNoteTags(db, noteId, tags);
    return noteId;
  });

  const noteId = insert();
  return getNoteById(noteId);
}

/**
 * Update an existing note and replace its tag associations.
 *
 * @param {number|string} id      - The note ID to update.
 * @param {string}        title   - New title.
 * @param {string}        content - New content.
 * @param {string[]}      [tags]  - Replacement tag array (optional; omit to leave tags unchanged).
 * @returns {Object|null} The updated note, or null if not found.
 */
// PUBLIC_INTERFACE
function updateNote(id, title, content, tags) {
  const db = getDb();

  const update = db.transaction(() => {
    const now = new Date().toISOString();

    // Build dynamic SET clause depending on what was supplied
    const fields = [];
    const values = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (content !== undefined) { fields.push('content = ?'); values.push(content); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(Number(id));

    const info = db.prepare(
      `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`
    ).run(...values);

    if (info.changes === 0) return null;

    if (Array.isArray(tags)) {
      setNoteTags(db, Number(id), tags);
    }

    return Number(id);
  });

  const noteId = update();
  return noteId !== null ? getNoteById(noteId) : null;
}

/**
 * Delete a note and its tag associations by ID.
 *
 * @param {number|string} id - The note ID to delete.
 * @returns {boolean} True if a row was deleted, false otherwise.
 */
// PUBLIC_INTERFACE
function deleteNote(id) {
  const db = getDb();
  const info = db.prepare('DELETE FROM notes WHERE id = ?').run(Number(id));
  return info.changes > 0;
}

/**
 * Search notes by a query string (case-insensitive substring match on title or content).
 * Optionally filter by one or more tag names.
 *
 * @param {string}   query    - Text to search for in title/content.
 * @param {string[]} [tagNames=[]] - Tag names to filter by (AND logic – note must have ALL tags).
 * @returns {Array<Object>} Matching notes.
 */
// PUBLIC_INTERFACE
function searchNotes(query, tagNames = []) {
  const db = getDb();
  const likePattern = `%${query || ''}%`;

  let sql = `
    SELECT
      n.id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      GROUP_CONCAT(t.name, ',') AS tags
    FROM notes n
    LEFT JOIN note_tags nt ON nt.note_id = n.id
    LEFT JOIN tags t       ON t.id = nt.tag_id
  `;

  const params = [];

  if (tagNames.length > 0) {
    // Filter notes that have ALL requested tags via a subquery
    const placeholders = tagNames.map(() => '?').join(', ');
    sql += `
      WHERE n.id IN (
        SELECT nt2.note_id
        FROM note_tags nt2
        JOIN tags t2 ON t2.id = nt2.tag_id
        WHERE t2.name IN (${placeholders})
        GROUP BY nt2.note_id
        HAVING COUNT(DISTINCT t2.name) = ?
      )
    `;
    params.push(...tagNames, tagNames.length);

    if (query) {
      sql += ' AND (n.title LIKE ? OR n.content LIKE ?)';
      params.push(likePattern, likePattern);
    }
  } else if (query) {
    sql += ' WHERE (n.title LIKE ? OR n.content LIKE ?)';
    params.push(likePattern, likePattern);
  }

  sql += ' GROUP BY n.id ORDER BY n.updated_at DESC';

  return db.prepare(sql).all(...params).map(normalizeNote);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Replace all tag associations for a given note.
 * Tags are created if they do not yet exist.
 *
 * @param {import('better-sqlite3').Database} db   - DB handle.
 * @param {number}   noteId - The note's ID.
 * @param {string[]} names  - Tag name strings.
 */
function setNoteTags(db, noteId, names) {
  // Remove existing associations
  db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);

  if (!names || names.length === 0) return;

  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const getTagId  = db.prepare('SELECT id FROM tags WHERE name = ?');
  const insertLink = db.prepare(
    'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)'
  );

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    insertTag.run(trimmed);
    const tag = getTagId.get(trimmed);
    if (tag) insertLink.run(noteId, tag.id);
  }
}

/**
 * Convert a raw DB row into a clean note object with a tags array.
 *
 * @param {Object} row - Raw row from SQLite query.
 * @returns {Object} Normalized note.
 */
function normalizeNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
  };
}

module.exports = { getAllNotes, getNoteById, createNote, updateNote, deleteNote, searchNotes };
